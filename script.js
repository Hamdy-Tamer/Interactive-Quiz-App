class QuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.currentReviewIndex = 0;
        this.userAnswers = [];
        this.timer = null;
        this.timeLeft = 60;
        this.quizCompleted = false;
        this.reviewMode = false;
        
        // DOM Elements
        this.questionContainer = document.getElementById('question-container');
        this.reviewContainer = document.getElementById('review-container');
        this.resultContainer = document.getElementById('result-container');
        this.questionText = document.getElementById('question-text');
        this.reviewQuestionText = document.getElementById('review-question-text');
        this.optionsContainer = document.getElementById('options');
        this.reviewOptionsContainer = document.getElementById('review-options');
        this.explanationBox = document.getElementById('explanation-box');
        this.bulletsContainer = document.getElementById('bullets');
        this.timerElement = document.getElementById('timer');
        this.questionCountElement = document.getElementById('question-count');
        this.clearChoicesBtn = document.getElementById('clear-choices-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.reviewPrevBtn = document.getElementById('review-prev-btn');
        this.reviewNextBtn = document.getElementById('review-next-btn');
        this.backToResultBtn = document.getElementById('back-to-result-btn');
        this.reviewNavButtons = document.getElementById('review-nav-buttons');
        this.mainNavButtons = document.getElementById('main-nav-buttons');
        this.restartBtn = document.getElementById('restart-btn');
        this.reviewAnswersBtn = document.getElementById('review-answers-btn');
        
        // Result Elements
        this.finalPercentage = document.getElementById('final-percentage');
        this.finalScoreText = document.getElementById('final-score-text');
        this.resultMessage = document.getElementById('result-message');
        this.percentageCircle = document.getElementById('percentage-circle');
        
        // Event Listeners
        this.prevBtn.addEventListener('click', () => this.showPreviousQuestion());
        this.nextBtn.addEventListener('click', () => this.handleNextClick());
        this.reviewPrevBtn.addEventListener('click', () => this.showPreviousReview());
        this.reviewNextBtn.addEventListener('click', () => this.showNextReview());
        this.backToResultBtn.addEventListener('click', () => this.backToResults());
        this.restartBtn.addEventListener('click', () => this.restartQuiz());
        this.reviewAnswersBtn.addEventListener('click', () => this.startReview());
        this.clearChoicesBtn.addEventListener('click', () => this.clearCurrentChoices());
        
        // Initialize Quiz
        this.fetchQuestions();
    }
    
    // Fetch questions from JSON file
    fetchQuestions() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'questions.json', true);
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    this.questions = data.questions;
                    this.questionCountElement.textContent = this.questions.length;
                    this.initializeQuiz();
                } catch (e) {
                    this.showErrorMessage('Invalid JSON data. Using fallback questions.');
                    this.useFallbackQuestions();
                }
            } else {
                this.showErrorMessage('Failed to load questions. Using fallback questions.');
                this.useFallbackQuestions();
            }
        };
        
        xhr.onerror = () => {
            this.showErrorMessage('Network error. Using fallback questions.');
            this.useFallbackQuestions();
        };
        
        xhr.send();
    }
    
    // Show error message
    showErrorMessage(message) {
        this.questionText.textContent = '⚠️ Connection Issue';
        this.optionsContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Note:</strong> ${message}
            </div>
        `;
    }
    
    initializeQuiz() {
        this.userAnswers = this.questions.map(() => []);
        this.createBullets();
        this.showQuestion(0);
        this.startTimer();
    }
    
    createBullets() {
        this.bulletsContainer.innerHTML = '';
        for (let i = 0; i < this.questions.length; i++) {
            const bullet = document.createElement('div');
            bullet.className = 'bullet';
            bullet.textContent = i + 1;
            bullet.dataset.index = i;
            bullet.addEventListener('click', () => this.goToQuestion(i));
            this.bulletsContainer.appendChild(bullet);
        }
        this.updateBullets();
    }
    
    updateBullets() {
        const bullets = document.querySelectorAll('.bullet');
        bullets.forEach((bullet, index) => {
            bullet.classList.remove('current', 'answered', 'correct-final', 'wrong-final');
            
            if (this.quizCompleted) {
                if (this.isQuestionCorrect(index)) {
                    bullet.classList.add('correct-final');
                } else {
                    bullet.classList.add('wrong-final');
                }
            } else {
                if (index === this.currentQuestionIndex) {
                    bullet.classList.add('current');
                }
                
                if (this.userAnswers[index] && this.userAnswers[index].length > 0) {
                    bullet.classList.add('answered');
                }
            }
        });
    }
    
    clearCurrentChoices() {
        this.userAnswers[this.currentQuestionIndex] = [];
        
        // Uncheck all inputs
        const inputs = document.querySelectorAll('.option-label input');
        inputs.forEach(input => {
            input.checked = false;
        });
        
        // Remove selected class from labels
        const labels = document.querySelectorAll('.option-label');
        labels.forEach(label => {
            label.classList.remove('selected');
        });
        
        this.updateBullets();
    }
    
    isQuestionCorrect(index) {
        const question = this.questions[index];
        const userAnswer = this.userAnswers[index] || [];
        const correctAnswers = question.correct;
        
        const sortedUser = [...userAnswer].sort();
        const sortedCorrect = [...correctAnswers].sort();
        
        return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    }
    
    showQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            const question = this.questions[index];
            this.questionText.textContent = question.question;
            
            // Determine if multiple answers
            const isMultiple = question.correct.length > 1 || question.type === 'multiple';
            
            // Generate options
            let optionsHtml = '';
            question.options.forEach((option, optIndex) => {
                const isChecked = this.userAnswers[index] && this.userAnswers[index].includes(optIndex);
                const inputType = isMultiple ? 'checkbox' : 'radio';
                const name = isMultiple ? `option_${index}[]` : `option_${index}`;
                const optionClass = isMultiple ? 'checkbox-option' : 'radio-option';
                
                optionsHtml += `
                    <div class="option-item">
                        <label class="option-label ${optionClass} ${isChecked ? 'selected' : ''}">
                            <input type="${inputType}" name="${name}" value="${optIndex}" ${isChecked ? 'checked' : ''} 
                                onchange="quizApp.selectOption(${index}, ${optIndex}, this.checked, ${isMultiple})">
                            ${option}
                        </label>
                    </div>
                `;
            });
            
            this.optionsContainer.innerHTML = optionsHtml;
            this.currentQuestionIndex = index;
            this.updateBullets();
            this.updateNavigationButtons();
        }
    }
    
    selectOption(questionIndex, optionIndex, isChecked, isMultiple) {
        if (!this.userAnswers[questionIndex]) {
            this.userAnswers[questionIndex] = [];
        }
        
        if (isMultiple) {
            // Multiple answers - toggle selection
            if (isChecked) {
                if (!this.userAnswers[questionIndex].includes(optionIndex)) {
                    this.userAnswers[questionIndex].push(optionIndex);
                }
            } else {
                this.userAnswers[questionIndex] = this.userAnswers[questionIndex]
                    .filter(ans => ans !== optionIndex);
            }
        } else {
            // Single answer - replace selection
            if (isChecked) {
                this.userAnswers[questionIndex] = [optionIndex];
            } else {
                this.userAnswers[questionIndex] = [];
            }
        }
        
        this.userAnswers[questionIndex].sort((a, b) => a - b);
        
        // Update UI
        if (!isMultiple) {
            // For radio buttons, update all labels
            const labels = document.querySelectorAll('.option-label');
            labels.forEach((label, idx) => {
                const input = label.querySelector('input');
                if (input && input.checked) {
                    label.classList.add('selected');
                } else {
                    label.classList.remove('selected');
                }
            });
        } else {
            // For checkboxes, just update the clicked label
            const currentLabel = event.target.closest('.option-label');
            if (isChecked) {
                currentLabel.classList.add('selected');
            } else {
                currentLabel.classList.remove('selected');
            }
        }
        
        this.updateBullets();
    }
    
    showPreviousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.showQuestion(this.currentQuestionIndex - 1);
        }
    }
    
    handleNextClick() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.showQuestion(this.currentQuestionIndex + 1);
        } else {
            this.finishQuiz();
        }
    }
    
    updateNavigationButtons() {
        this.prevBtn.disabled = this.currentQuestionIndex === 0;
        
        if (this.currentQuestionIndex === this.questions.length - 1) {
            this.nextBtn.innerHTML = 'Finish <i class="fas fa-check ms-2"></i>';
        } else {
            this.nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right ms-2"></i>';
        }
    }
    
    goToQuestion(index) {
        if (index >= 0 && index < this.questions.length && !this.quizCompleted) {
            this.showQuestion(index);
        }
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.timeOut();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.timeLeft <= 10) {
            this.timerElement.parentElement.classList.add('warning');
        }
    }
    
    timeOut() {
        clearInterval(this.timer);
        this.finishQuiz();
    }
    
    calculateScore() {
        let correct = 0;
        this.questions.forEach((_, index) => {
            if (this.isQuestionCorrect(index)) {
                correct++;
            }
        });
        return correct;
    }
    
    finishQuiz() {
        clearInterval(this.timer);
        this.quizCompleted = true;
        
        this.questionContainer.classList.add('d-none');
        this.resultContainer.classList.remove('d-none');
        this.mainNavButtons.classList.add('d-none');
        
        const correctAnswers = this.calculateScore();
        const totalQuestions = this.questions.length;
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        
        this.finalPercentage.textContent = `${percentage}%`;
        this.finalScoreText.textContent = `${correctAnswers}/${totalQuestions}`;
        
        const degrees = (percentage / 100) * 360;
        this.percentageCircle.style.background = `conic-gradient(#4caf50 ${degrees}deg, #e9ecef ${degrees}deg)`;
        
        let message = '';
        if (percentage >= 80) {
            message = 'Excellent! You did great! 🎉';
        } else if (percentage >= 60) {
            message = 'Good job! Keep practicing! 👍';
        } else if (percentage >= 40) {
            message = 'Not bad! You can do better! 💪';
        } else {
            message = 'Keep learning! Try again! 📚';
        }
        
        this.resultMessage.textContent = message;
        this.updateBullets();
    }
    
    startReview() {
        this.reviewMode = true;
        this.currentReviewIndex = 0;
        
        this.resultContainer.classList.add('d-none');
        this.reviewContainer.classList.remove('d-none');
        this.reviewNavButtons.classList.remove('d-none');
        
        this.showReviewQuestion(0);
    }
    
    showReviewQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            const question = this.questions[index];
            const userAnswers = this.userAnswers[index] || [];
            const isCorrect = this.isQuestionCorrect(index);
            
            this.reviewQuestionText.textContent = `Question ${index + 1}: ${question.question}`;
            
            let reviewHtml = '';
            
            question.options.forEach((option, optIndex) => {
                let optionClass = 'review-option-label';
                let icon = '';
                let userAnswerText = '';
                
                // Mark correct answers
                if (question.correct.includes(optIndex)) {
                    optionClass += ' correct-answer';
                    icon = '<i class="fas fa-check-circle text-success"></i>';
                }
                
                // Mark user's answers
                if (userAnswers.includes(optIndex)) {
                    userAnswerText = ' (Your answer)';
                    
                    if (!question.correct.includes(optIndex)) {
                        optionClass += ' wrong-answer user-selected';
                        icon = '<i class="fas fa-times-circle text-danger"></i>';
                    } else {
                        optionClass += ' correct-answer user-selected';
                    }
                }
                
                reviewHtml += `
                    <div class="review-option-item">
                        <div class="${optionClass}">
                            ${icon} ${option}${userAnswerText}
                        </div>
                    </div>
                `;
            });
            
            this.reviewOptionsContainer.innerHTML = reviewHtml;
            
            // Show explanation
            if (!isCorrect) {
                const correctOptions = question.correct.map(idx => question.options[idx]).join('", "');
                const userAnswerText = userAnswers.length > 0 ? 
                    userAnswers.map(idx => question.options[idx]).join('", "') : 
                    'Not answered';
                
                this.explanationBox.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <strong>Review:</strong> Your answer: "${userAnswerText}" | 
                    Correct answer(s): "${correctOptions}"
                `;
            } else {
                this.explanationBox.innerHTML = `
                    <i class="fas fa-check-circle text-success"></i>
                    <strong>Perfect!</strong> You selected the correct answer(s)!
                `;
            }
            
            this.currentReviewIndex = index;
            this.updateReviewButtons();
        }
    }
    
    showPreviousReview() {
        if (this.currentReviewIndex > 0) {
            this.showReviewQuestion(this.currentReviewIndex - 1);
        }
    }
    
    showNextReview() {
        if (this.currentReviewIndex < this.questions.length - 1) {
            this.showReviewQuestion(this.currentReviewIndex + 1);
        }
    }
    
    updateReviewButtons() {
        this.reviewPrevBtn.disabled = this.currentReviewIndex === 0;
        this.reviewNextBtn.disabled = this.currentReviewIndex === this.questions.length - 1;
    }
    
    backToResults() {
        this.reviewMode = false;
        this.reviewContainer.classList.add('d-none');
        this.resultContainer.classList.remove('d-none');
        this.reviewNavButtons.classList.add('d-none');
    }
    
    restartQuiz() {
        this.currentQuestionIndex = 0;
        this.currentReviewIndex = 0;
        this.userAnswers = this.questions.map(() => []);
        this.timeLeft = 60;
        this.quizCompleted = false;
        this.reviewMode = false;
        
        this.questionContainer.classList.remove('d-none');
        this.resultContainer.classList.add('d-none');
        this.reviewContainer.classList.add('d-none');
        this.reviewNavButtons.classList.add('d-none');
        this.mainNavButtons.classList.remove('d-none');
        
        this.timerElement.parentElement.classList.remove('warning');
        this.updateTimerDisplay();
        
        const bullets = document.querySelectorAll('.bullet');
        bullets.forEach(bullet => {
            bullet.classList.remove('answered', 'current', 'correct-final', 'wrong-final');
        });
        
        this.showQuestion(0);
        
        clearInterval(this.timer);
        this.startTimer();
    }
}

// Initialize the quiz app
const quizApp = new QuizApp();