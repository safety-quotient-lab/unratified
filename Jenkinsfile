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

        stage('Type Check') {
            steps {
                sh 'npm run check'
            }
        }

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
        failure {
            echo "Build failed: ${env.BUILD_URL}"
        }
    }
}
