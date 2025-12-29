// ===== FILE MENU =====
const menuItems = document.querySelectorAll('.menu-item');

menuItems.forEach(menu => {
    menu.addEventListener('click', (e) => {
        e.stopPropagation(); // Чтобы клик не ушел на document

        // 1. Проверяем, открыто ли текущее меню сейчас
        const isAlreadyOpen = menu.classList.contains('open');

        // 2. Закрываем ВСЕ меню (чтобы не висели два открытых сразу)
        menuItems.forEach(m => m.classList.remove('open'));

        // 3. Если текущее меню было закрыто — открываем его
        if (!isAlreadyOpen) {
            menu.classList.add('open');
        }
    });
});

// Закрываем все меню при клике в любое пустое место экрана
document.addEventListener('click', () => {
    menuItems.forEach(menu => menu.classList.remove('open'));
});
