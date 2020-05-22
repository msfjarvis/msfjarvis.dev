const STORAGE_KEY = 'user-color-scheme';
const modeToggleButtonMobile = document.querySelector('.js-mode-toggle');
const modeToggleButtonDesktop = document.querySelector(
    '.js-mode-toggle-desktop'
);

const applySetting = (passedSetting) => {
    let currentSetting = passedSetting || localStorage.getItem(STORAGE_KEY);
    if (currentSetting) {
        document.documentElement.setAttribute(
            'data-user-color-scheme',
            currentSetting
        );
    }
};
const toggleSetting = () => {
    let currentSetting = localStorage.getItem(STORAGE_KEY);
    switch (currentSetting) {
        case null:
            const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            currentSetting = userPrefersDark ? 'dark' : 'light';
            break;
        case 'light':
            currentSetting = 'dark';
            break;
        case 'dark':
            currentSetting = 'light';
            break;
    }
    localStorage.setItem(STORAGE_KEY, currentSetting);
    return currentSetting;
};
[modeToggleButtonDesktop, modeToggleButtonMobile].forEach((element) => {
    element.addEventListener('click', (evt) => {
        evt.preventDefault();
        applySetting(toggleSetting());
    });
});
applySetting();
