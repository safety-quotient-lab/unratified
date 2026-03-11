// Unratified — Tier 2 CI/CD Pipeline
//
// CONTEXT
// Unratified hosts the blog (Astro/CF Pages), ActivityPub worker, and
// monitor worker. Tier 1 (GitHub Actions) handles the Cloudflare deploys
// directly. This Jenkins pipeline adds build validation (type check,
// page count verification) and provides a fallback deploy path.
//
// BUILD TRIGGER
// Builds trigger via a GitHub Actions relay (.github/workflows/trigger-forge.yml).
// See that file for why a relay is needed (Cloudflare Access authentication).
// SCM polling (H/5 * * * *) serves as a fallback.
//
// Required credentials (Jenkins > Manage > Credentials):
//   'cloudflare-workers-token'  — CF API token (Secret text)
//   'cloudflare-account-id'     — CF account ID (Secret text)

pipeline {
    agent any

    environment {
        CLOUDFLARE_API_TOKEN = credentials('cloudflare-workers-token')
        CLOUDFLARE_ACCOUNT_ID = credentials('cloudflare-account-id')
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        // TypeScript type checking catches structural errors before deploy.
        stage('Type Check') {
            steps {
                sh 'npm run check'
            }
        }

        // Build the Astro blog and verify output.
        // The page count gate (≥30) catches build regressions that silently
        // drop pages — an empty blog/dist would otherwise deploy successfully.
        stage('Build Blog') {
            steps {
                dir('blog') {
                    sh 'npm ci'
                }
                sh 'npm run build:blog'
            }
        }

        stage('Verify Pages') {
            steps {
                sh '''
                    COUNT=$(find blog/dist -name "index.html" | wc -l)
                    echo "Pages built: $COUNT"
                    if [ "$COUNT" -lt 30 ]; then
                        echo "ERROR: Expected at least 30 pages, got $COUNT"
                        exit 1
                    fi
                '''
            }
        }

        // Deploy stages duplicate Tier 1 as a fallback path.
        stage('Deploy Blog') {
            when { branch 'main' }
            steps {
                sh 'npx wrangler pages deploy blog/dist --project-name=unratified-blog'
            }
        }

        stage('Deploy Workers') {
            when {
                branch 'main'
                changeset 'workers/**'
            }
            steps {
                dir('workers/ap') {
                    sh 'npx wrangler deploy'
                }
                dir('workers/monitor') {
                    sh 'npx wrangler deploy'
                }
            }
        }
    }

    post {
        success {
            echo "Build succeeded: ${env.BUILD_URL}"
        }
        failure {
            echo "Build failed: ${env.BUILD_URL}"
        }
    }
}
