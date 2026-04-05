// ========== GOOGLE SHEETS API - СИСТЕМА ОТЗЫВОВ ==========

// ⚠️ ВСТАВЬТЕ ВАШ URL ИЗ GOOGLE APPS SCRIPT!
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6qlLLzGMRkugKT0EpsIpK5q2CeBrml_sk0mUl3XcoPha4ahEMjKZMM9izjmynLmSMgQ/exec';

// ⚠️ ВАШ СЕКРЕТНЫЙ ПАРОЛЬ
const ADMIN_SECRET = 'candyshop2025';

let isAdminMode = false;
let currentReviews = [];

// Загрузка отзывов
async function loadReviews() {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error('Network error');
        
        currentReviews = await response.json();
        
        if (!currentReviews || currentReviews.length === 0) {
            container.innerHTML = `
                <div class="reviews__empty">
                    <span>📝</span>
                    <p>No reviews yet. Be the first to leave a review!</p>
                </div>
            `;
            return;
        }
        
        renderReviews();
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = `
            <div class="reviews__empty">
                <span>⚠️</span>
                <p>Error loading reviews. Check console for details.</p>
            </div>
        `;
    }
}

// Рендер отзывов
function renderReviews() {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    let html = '';
    currentReviews.forEach((review, index) => {
        if (!review.name || !review.text) return;
        
        const timestamp = review.rowId || review.timestamp || `review-${index}`;
        
        html += `
            <div class="review-card" data-timestamp="${timestamp}">
                <div class="review-card__header">
                    <div class="review-card__author">
                        <span class="review-card__name">${escapeHtml(review.name)}</span>
                        ${review.city ? `<span class="review-card__city">📍 ${escapeHtml(review.city)}</span>` : ''}
                    </div>
                    <div class="review-card__rating">
                        ${generateStars(review.rating || 5)}
                    </div>
                </div>
                <p class="review-card__text">${escapeHtml(review.text)}</p>
                
                ${review.adminReply ? `
                    <div class="admin-reply">
                        <div class="admin-reply__header">
                            <span class="admin-reply__badge">Admin Response</span>
                        </div>
                        <p class="admin-reply__text">${escapeHtml(review.adminReply)}</p>
                    </div>
                ` : ''}
                
                <div class="review-card__date">${review.date || 'Recently'}</div>
                
                ${isAdminMode ? `
                    <div class="admin-actions" style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="admin-reply-btn" onclick="showReplyInput('${timestamp}')">💬 Reply</button>
                        <button class="admin-delete-btn" onclick="deleteReview('${timestamp}')">🗑️ Delete</button>
                    </div>
                    <div id="reply-input-${timestamp}" class="reply-input-area" style="display: none; margin-top: 10px;">
                        <input type="text" id="reply-text-${timestamp}" placeholder="Write your response...">
                        <button onclick="submitReply('${timestamp}')">Send Reply</button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Показать поле для ввода ответа
function showReplyInput(timestamp) {
    const inputArea = document.getElementById(`reply-input-${timestamp}`);
    if (inputArea) {
        inputArea.style.display = inputArea.style.display === 'none' ? 'flex' : 'none';
    }
}

// Отправить ответ админа
async function submitReply(timestamp) {
    const replyText = document.getElementById(`reply-text-${timestamp}`)?.value;
    
    if (!replyText || replyText.trim() === '') {
        showStatus('Please enter a reply!', true);
        return;
    }
    
    showStatus('Sending reply...', false);
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adminAction: true,
                action: 'reply',
                timestamp: timestamp,
                reply: replyText.trim(),
                secret: ADMIN_SECRET
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('✅ Reply added successfully!');
            await loadReviews(); // Перезагружаем отзывы
        } else {
            showStatus('❌ ' + result.message, true);
        }
        
    } catch (error) {
        console.error('Reply error:', error);
        showStatus('❌ Network error. Check console.', true);
    }
}

// Удалить отзыв
async function deleteReview(timestamp) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone!')) {
        return;
    }
    
    showStatus('Deleting review...', false);
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adminAction: true,
                action: 'delete',
                timestamp: timestamp,
                secret: ADMIN_SECRET
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('✅ Review deleted successfully!');
            await loadReviews(); // Перезагружаем отзывы
        } else {
            showStatus('❌ ' + result.message, true);
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showStatus('❌ Network error. Check console.', true);
    }
}

// Вход в админ-режим
function enableAdminMode() {
    const password = prompt('Enter admin password:');
    if (password === ADMIN_SECRET) {
        isAdminMode = true;
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) adminPanel.style.display = 'block';
        showStatus('✅ Admin mode enabled! You can now delete and reply to reviews.', false);
        renderReviews();
    } else if (password !== null) {
        showStatus('❌ Incorrect password!', true);
    }
}

// Выход из админ-режима
function disableAdminMode() {
    isAdminMode = false;
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) adminPanel.style.display = 'none';
    showStatus('Admin mode disabled.');
    renderReviews();
}

// Добавление отзыва
async function addReview(name, city, rating, text) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                city: city,
                rating: rating,
                text: text
            })
        });
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('Add review error:', error);
        return { success: false, error: error.message };
    }
}

// Генерация звёзд
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="review-card__star ${i <= rating ? 'filled' : ''}">★</span>`;
    }
    return stars;
}

// Экранирование HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показать статус
function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('reviewStatus');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = `review-status ${isError ? 'error' : 'success'}`;
    
    setTimeout(() => {
        if (statusDiv.textContent === message) {
            statusDiv.className = '';
            statusDiv.textContent = '';
        }
    }, 4000);
}

// ========== МОБИЛЬНОЕ МЕНЮ ==========
const mobileBtn = document.querySelector('.mobile-menu-btn');
const nav = document.querySelector('.header__nav');

if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
}

// ========== ПЛАВНЫЙ СКРОЛЛ ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// ========== BACK TO TOP ==========
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('show', window.scrollY > 300);
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadReviews();
    
    // Настройка звёздного рейтинга
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('reviewRating');
    
    if (stars.length && ratingInput) {
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.dataset.value);
                ratingInput.value = value;
                stars.forEach(s => {
                    const starValue = parseInt(s.dataset.value);
                    if (starValue <= value) {
                        s.classList.add('active');
                        s.textContent = '★';
                    } else {
                        s.classList.remove('active');
                        s.textContent = '☆';
                    }
                });
            });
        });
    }
    
    // Кнопка отправки отзыва
    const submitBtn = document.getElementById('submitReview');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const name = document.getElementById('reviewName')?.value || '';
            const city = document.getElementById('reviewCity')?.value || '';
            const rating = parseInt(document.getElementById('reviewRating')?.value || '5');
            const text = document.getElementById('reviewText')?.value || '';
            
            if (!name.trim()) { showStatus('Please enter your name!', true); return; }
            if (!text.trim()) { showStatus('Please enter your review!', true); return; }
            if (text.trim().length < 10) { showStatus('Please write at least 10 characters!', true); return; }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            const result = await addReview(name, city, rating, text);
            
            if (result && result.success) {
                showStatus('✅ Thank you for your review!');
                document.getElementById('reviewName').value = '';
                document.getElementById('reviewCity').value = '';
                document.getElementById('reviewText').value = '';
                ratingInput.value = 5;
                stars.forEach(s => { s.classList.add('active'); s.textContent = '★'; });
                setTimeout(() => loadReviews(), 1000);
            } else {
                showStatus('❌ Error: ' + (result?.message || 'Unknown error'), true);
            }
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review →';
        });
    }
    
    // Вход в админ-режим по двойному клику на логотипе
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('dblclick', () => {
            if (isAdminMode) {
                disableAdminMode();
            } else {
                enableAdminMode();
            }
        });
    }
});
// ========== ГОРИЗОНТАЛЬНЫЙ СЛАЙДЕР ОТЗЫВОВ ==========

let currentSlideIndex = 0;
let slidesData = [];

// Рендер слайдера
function renderSlider() {
    const track = document.getElementById('sliderTrack');
    const dotsContainer = document.getElementById('sliderDots');
    
    if (!track || !slidesData.length) {
        if (track && slidesData.length === 0) {
            track.innerHTML = `
                <div class="reviews__empty" style="width: 100%;">
                    <span>📝</span>
                    <p>No reviews yet. Be the first to leave a review!</p>
                </div>
            `;
        }
        return;
    }
    
    // Создаём слайды
    let slidesHtml = '';
    slidesData.forEach((review, idx) => {
        const timestamp = review.rowId || review.timestamp || `review-${idx}`;
        
        slidesHtml += `
            <div class="review-card-slide" data-slide-index="${idx}">
                <div class="review-card" data-timestamp="${timestamp}">
                    <div class="review-card__header">
                        <div class="review-card__author">
                            <span class="review-card__name">${escapeHtml(review.name)}</span>
                            ${review.city ? `<span class="review-card__city">📍 ${escapeHtml(review.city)}</span>` : ''}
                        </div>
                        <div class="review-card__rating">
                            ${generateStars(review.rating || 5)}
                        </div>
                    </div>
                    <p class="review-card__text">${escapeHtml(review.text)}</p>
                    
                    ${review.adminReply ? `
                        <div class="admin-reply">
                            <div class="admin-reply__header">
                                <span class="admin-reply__badge">Admin Response</span>
                            </div>
                            <p class="admin-reply__text">${escapeHtml(review.adminReply)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="review-card__date">${review.date || 'Recently'}</div>
                    
                    ${isAdminMode ? `
                        <div class="admin-actions" style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button class="admin-reply-btn" onclick="showReplyInput('${timestamp}')">💬 Reply</button>
                            <button class="admin-delete-btn" onclick="deleteReviewFromSlider('${timestamp}', ${idx})">🗑️ Delete</button>
                        </div>
                        <div id="reply-input-${timestamp}" class="reply-input-area" style="display: none; margin-top: 10px;">
                            <input type="text" id="reply-text-${timestamp}" placeholder="Write your response...">
                            <button onclick="submitReplyFromSlider('${timestamp}', ${idx})">Send Reply</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    track.innerHTML = slidesHtml;
    
    // Обновляем позицию слайда
    updateSliderPosition();
    
    // Создаём точки-индикаторы
    let dotsHtml = '';
    slidesData.forEach((_, idx) => {
        dotsHtml += `<div class="slider-dot ${idx === currentSlideIndex ? 'active' : ''}" data-dot-index="${idx}"></div>`;
    });
    dotsContainer.innerHTML = dotsHtml;
    
    // Добавляем обработчики для точек
    document.querySelectorAll('.slider-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.dotIndex);
            if (!isNaN(index)) {
                goToSlide(index);
            }
        });
    });
}

// Обновление позиции слайда
function updateSliderPosition() {
    const track = document.getElementById('sliderTrack');
    if (track && slidesData.length > 0) {
        const offset = -currentSlideIndex * 100;
        track.style.transform = `translateX(${offset}%)`;
    }
    
    // Обновляем активные точки
    document.querySelectorAll('.slider-dot').forEach((dot, idx) => {
        if (idx === currentSlideIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Переход к следующему слайду
function nextSlide() {
    if (slidesData.length === 0) return;
    currentSlideIndex = (currentSlideIndex + 1) % slidesData.length;
    updateSliderPosition();
}

// Переход к предыдущему слайду
function prevSlide() {
    if (slidesData.length === 0) return;
    currentSlideIndex = (currentSlideIndex - 1 + slidesData.length) % slidesData.length;
    updateSliderPosition();
}

// Переход к конкретному слайду
function goToSlide(index) {
    if (index < 0 || index >= slidesData.length) return;
    currentSlideIndex = index;
    updateSliderPosition();
}

// Обновлённая функция загрузки отзывов
async function loadReviews() {
    const track = document.getElementById('sliderTrack');
    if (!track) return;
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error('Network error');
        
        const reviews = await response.json();
        
        if (!reviews || reviews.length === 0) {
            track.innerHTML = `
                <div class="reviews__empty" style="width: 100%;">
                    <span>📝</span>
                    <p>No reviews yet. Be the first to leave a review!</p>
                </div>
            `;
            return;
        }
        
        slidesData = reviews;
        currentSlideIndex = 0;
        renderSlider();
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        track.innerHTML = `
            <div class="reviews__empty" style="width: 100%;">
                <span>⚠️</span>
                <p>Error loading reviews. Check console for details.</p>
            </div>
        `;
    }
}

// Удаление отзыва из слайдера
async function deleteReviewFromSlider(timestamp, slideIndex) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone!')) {
        return;
    }
    
    showStatus('Deleting review...', false);
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminAction: true,
                action: 'delete',
                timestamp: timestamp,
                secret: ADMIN_SECRET
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('✅ Review deleted successfully!');
            await loadReviews();
        } else {
            showStatus('❌ ' + result.message, true);
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showStatus('❌ Network error. Check console.', true);
    }
}

// Ответ на отзыв из слайдера
async function submitReplyFromSlider(timestamp, slideIndex) {
    const replyText = document.getElementById(`reply-text-${timestamp}`)?.value;
    
    if (!replyText || replyText.trim() === '') {
        showStatus('Please enter a reply!', true);
        return;
    }
    
    showStatus('Sending reply...', false);
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminAction: true,
                action: 'reply',
                timestamp: timestamp,
                reply: replyText.trim(),
                secret: ADMIN_SECRET
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('✅ Reply added successfully!');
            await loadReviews();
        } else {
            showStatus('❌ ' + result.message, true);
        }
        
    } catch (error) {
        console.error('Reply error:', error);
        showStatus('❌ Network error. Check console.', true);
    }
}

// Показать поле для ввода ответа
function showReplyInput(timestamp) {
    const inputArea = document.getElementById(`reply-input-${timestamp}`);
    if (inputArea) {
        inputArea.style.display = inputArea.style.display === 'none' ? 'flex' : 'none';
    }
}

// Обновлённая функция добавления отзыва
async function addReview(name, city, rating, text) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                city: city,
                rating: rating,
                text: text
            })
        });
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('Add review error:', error);
        return { success: false, error: error.message };
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ СЛАЙДЕРА ==========

// Добавляем обработчики для стрелок
document.addEventListener('DOMContentLoaded', () => {
    // ... остальной код инициализации ...
    
    // Стрелки слайдера
    const prevBtn = document.getElementById('prevReview');
    const nextBtn = document.getElementById('nextReview');
    
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    // Загружаем отзывы
    loadReviews();
    
    // ... остальной код (звёзды, кнопка отправки, админ-режим) ...
});
// ========== МОДАЛЬНЫЕ ОКНА ДЛЯ УСЛУГ ==========

// Открытие модального окна
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Блокируем скролл страницы
    }
}

// Закрытие модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Возвращаем скролл
    }
}

// Закрытие по клику вне окна
window.onclick = function(event) {
    const modals = document.querySelectorAll('.service-modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

// Прокрутка к секции контактов
function scrollToContact() {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
    }
    // Закрываем все модальные окна
    const modals = document.querySelectorAll('.service-modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = '';
}

// Добавляем обработчики на карточки услуг
document.addEventListener('DOMContentLoaded', () => {
    // Находим все карточки услуг и добавляем обработчик клика
    const serviceCards = document.querySelectorAll('.service-card');
    
    if (serviceCards.length) {
        serviceCards.forEach((card, index) => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                // Определяем, какое модальное окно открыть
                const title = card.querySelector('.service-card__title')?.innerText || '';
                
                if (title.includes('Landing')) {
                    openModal('modalLanding');
                } else if (title.includes('Business')) {
                    openModal('modalBusiness');
                } else if (title.includes('E-commerce')) {
                    openModal('modalEcommerce');
                } else if (title.includes('Maintenance')) {
                    openModal('modalMaintenance');
                }
            });
        });
    }
});
// ========== МОДАЛЬНЫЕ ОКНА ДЛЯ ПАКЕТОВ ЦЕН ==========

// Добавляем обработчики на карточки цен
document.addEventListener('DOMContentLoaded', () => {
    // ... существующий код ...
    
    // Находим все карточки цен и добавляем обработчик клика на кнопку Get Started
    const pricingCards = document.querySelectorAll('.pricing-card');
    
    if (pricingCards.length) {
        pricingCards.forEach((card, index) => {
            // Находим кнопку внутри карточки
            const getStartedBtn = card.querySelector('.pricing-card__btn');
            if (getStartedBtn) {
                // Сохраняем оригинальный обработчик (если есть)
                const originalClick = getStartedBtn.onclick;
                
                // Добавляем новый обработчик
                getStartedBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Определяем, какое модальное окно открыть
                    const title = card.querySelector('.pricing-card__title')?.innerText || '';
                    
                    if (title.includes('Basic')) {
                        openModal('modalBasic');
                    } else if (title.includes('Pro')) {
                        openModal('modalPro');
                    } else if (title.includes('Premium')) {
                        openModal('modalPremium');
                    }
                });
            }
        });
    }
});
// ========== ПРОМО-БАННЕР АКЦИИ ==========

document.addEventListener('DOMContentLoaded', () => {
    // ... существующий код ...
    
    // Кнопка "Подробнее" для акции
    const promoBtn = document.getElementById('promoDetailsBtn');
    if (promoBtn) {
        promoBtn.addEventListener('click', () => {
            openModal('modalPromo');
        });
    }
});
// ========== ДЕТАЛЬНЫЙ ПРОСМОТР ПРОЕКТА ==========

let currentProject = null;
let currentGalleryIndex = 0;

// Открытие детального окна проекта
function openProjectDetail(projectId) {
    const project = portfolioProjects.find(p => p.id === projectId);
    if (!project) return;
    
    currentProject = project;
    currentGalleryIndex = 0;
    
    // Заполняем информацию
    document.getElementById('projectDetailTitle').textContent = project.title;
    document.getElementById('projectDetailCategory').textContent = project.category;
    document.getElementById('projectDetailDescription').textContent = project.description || 'No description provided.';
    document.getElementById('projectDetailPrice').textContent = project.price || 'Contact for price';
    
    // Ссылка на живой сайт
    const liveLink = document.getElementById('projectDetailLink');
    if (project.liveUrl && project.liveUrl !== '') {
        liveLink.href = project.liveUrl;
        liveLink.style.display = 'inline-block';
    } else {
        liveLink.style.display = 'none';
    }
    
    // Создаём галерею
    let galleryImages = [project.imageUrl];
    if (project.gallery && project.gallery.length > 0) {
        galleryImages = [...galleryImages, ...project.gallery];
    }
    
    // Отображаем главное изображение
    const mainImg = document.getElementById('galleryMainImg');
    if (galleryImages[0]) {
        mainImg.src = galleryImages[0];
        mainImg.alt = project.title;
    }
    
    // Создаём миниатюры
    const thumbsContainer = document.getElementById('galleryThumbs');
    thumbsContainer.innerHTML = '';
    
    galleryImages.forEach((imgUrl, idx) => {
        const thumb = document.createElement('img');
        thumb.src = imgUrl;
        thumb.alt = `Thumbnail ${idx + 1}`;
        thumb.className = 'gallery-thumb';
        if (idx === 0) thumb.classList.add('active');
        thumb.addEventListener('click', () => {
            currentGalleryIndex = idx;
            mainImg.src = imgUrl;
            document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
        thumbsContainer.appendChild(thumb);
    });
    
    // Открываем модальное окно
    document.getElementById('modalProjectDetail').style.display = 'block';
}

// Обновляем рендер портфолио (добавляем обработчик клика на карточку)
function renderPortfolio() {
    const container = document.getElementById('portfolioGrid');
    if (!container) return;
    
    if (!portfolioProjects || portfolioProjects.length === 0) {
        container.innerHTML = `
            <div class="portfolio__empty" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <span>📁</span>
                <p>No projects yet. Add your first work!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    portfolioProjects.forEach(project => {
        html += `
            <div class="portfolio-card" data-id="${project.id}" onclick="openProjectDetail('${project.id}')">
                <img src="${project.imageUrl}" alt="${project.title}" class="portfolio-card__img" onerror="this.src='https://placehold.co/400x300/1a1a2e/white?text=No+Image'">
                <div class="portfolio-card__overlay">
                    <h3 class="portfolio-card__title">${escapeHtml(project.title)}</h3>
                    <p class="portfolio-card__type">${escapeHtml(project.category)}</p>
                </div>
                ${isAdminMode ? `<button class="portfolio-card__delete" onclick="event.stopPropagation(); confirmDeleteProject('${project.id}', '${escapeHtml(project.title)}')">🗑️</button>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Обновляем функцию добавления проекта (добавляем новые поля)
function openAddProjectModal() {
    if (!isAdminMode) return;
    
    // Очищаем форму
    document.getElementById('projectTitle').value = '';
    document.getElementById('projectCategory').value = 'E-commerce';
    document.getElementById('projectImageUrl').value = '';
    document.getElementById('projectLiveUrl').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('projectPrice').value = '';
    document.getElementById('projectGallery').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    
    document.getElementById('modalAddProject').style.display = 'block';
}

// Обновлённая функция добавления проекта (с новыми полями)
async function addNewProject() {
    const title = document.getElementById('projectTitle').value.trim();
    const category = document.getElementById('projectCategory').value;
    const imageUrl = document.getElementById('projectImageUrl').value.trim();
    const liveUrl = document.getElementById('projectLiveUrl').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    const price = document.getElementById('projectPrice').value.trim();
    const galleryInput = document.getElementById('projectGallery').value.trim();
    
    if (!title) {
        showStatus('Please enter project title!', true);
        return;
    }
    
    if (!imageUrl) {
        showStatus('Please enter image URL!', true);
        return;
    }
    
    // Разбираем галерею (ссылки через запятую)
    let gallery = [];
    if (galleryInput) {
        gallery = galleryInput.split(',').map(url => url.trim()).filter(url => url);
    }
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'portfolio',
                action: 'add',
                title: title,
                category: category,
                imageUrl: imageUrl,
                liveUrl: liveUrl,
                description: description,
                price: price,
                gallery: gallery,
                secret: ADMIN_SECRET
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('✅ Project added successfully!');
            closeModal('modalAddProject');
            await loadPortfolio();
        } else {
            showStatus('❌ ' + result.message, true);
        }
        
    } catch (error) {
        showStatus('❌ Network error', true);
    }
}