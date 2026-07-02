pipeline {
    agent any

    environment {
        DOCKER_IMAGE      = 'willstiti/tasklist-frontend'
        SONAR_PROJECT_KEY = 'William-examen-frontend'
        SONAR_HOST_URL    = 'https://sonarqube.cicd.kits.ext.educentre.fr'
        TRIVY_IMAGE       = 'aquasec/trivy:0.56.2'
        TRIVY_SEVERITY    = 'HIGH,CRITICAL'
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Unit Tests + Coverage') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'Willstiti-sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        set -e

                        run_sonar() {
                          sonar-scanner \
                            -Dsonar.host.url=$SONAR_HOST_URL \
                            -Dsonar.projectKey=$SONAR_PROJECT_KEY \
                            -Dsonar.sources=src \
                            -Dsonar.exclusions=src/__tests__/**,src/main.tsx \
                            -Dsonar.tests=src/__tests__ \
                            -Dsonar.test.inclusions=src/__tests__/**/*.test.ts,src/__tests__/**/*.test.tsx \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.qualitygate.wait=true \
                            -Dsonar.qualitygate.timeout=300 \
                            -Dsonar.token=$SONAR_TOKEN
                        }

                        if ! run_sonar; then
                          echo 'First Sonar scan failed. Cleaning Sonar cache and retrying once.'
                          rm -rf "$HOME/.sonar/cache"/* || true
                          run_sonar
                        fi
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker buildx build \
                      --platform linux/amd64 \
                      -t $DOCKER_IMAGE:$BUILD_NUMBER \
                      -t $DOCKER_IMAGE:latest \
                      --sbom=true \
                      --provenance=true \
                      --load \
                      .
                '''
            }
        }

        stage('Trivy Scan (Block HIGH/CRITICAL)') {
            steps {
                sh '''
                    mkdir -p reports

                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v "$PWD:/work" \
                      -w /work \
                      "$TRIVY_IMAGE" image --no-progress \
                      --format json \
                      --output reports/trivy-image-report.json \
                      "$DOCKER_IMAGE:$BUILD_NUMBER"

                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v "$PWD:/work" \
                      -w /work \
                      "$TRIVY_IMAGE" image --no-progress \
                      --format spdx-json \
                      --output reports/sbom-image-spdx.json \
                      "$DOCKER_IMAGE:$BUILD_NUMBER"

                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      "$TRIVY_IMAGE" image --no-progress \
                      --severity "$TRIVY_SEVERITY" \
                      --exit-code 1 \
                      "$DOCKER_IMAGE:$BUILD_NUMBER"
                '''
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'Willstiti-dockerhub-password', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_PASS')]) {
                    sh 'echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin'
                    sh 'docker push $DOCKER_IMAGE:$BUILD_NUMBER'
                    sh 'docker push $DOCKER_IMAGE:latest'
                }
            }
        }
    }

    post {
        always {
            script {
                archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/junit.xml,reports/trivy-image-report.json,reports/sbom-image-spdx.json,sbom-spdx.json,sbom-cyclonedx.json'
                try {
                    sh 'docker logout || true'
                } catch (Exception e) {
                    echo "docker logout ignored: ${e.getClass().getSimpleName()}"
                }
                try {
                    cleanWs()
                } catch (Exception e) {
                    echo "cleanWs ignored: ${e.getClass().getSimpleName()}"
                }
            }
        }
        success {
            echo 'Frontend pipeline completed successfully.'
        }
        failure {
            echo 'Frontend pipeline failed. Check logs above.'
        }
    }
}
