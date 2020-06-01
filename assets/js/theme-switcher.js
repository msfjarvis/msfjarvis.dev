const COLOR_MODE_KEY = '--color-mode';
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
const getCSSCustomProp = (propKey) => {
    let response = getComputedStyle(document.documentElement).getPropertyValue(
        propKey
    );
    if (response.length) {
        response = response.replace(/\"/g, '').trim();
    }
    return response;
};
const toggleSetting = () => {
    let currentSetting = localStorage.getItem(STORAGE_KEY);
    switch (currentSetting) {
        case null:
            currentSetting =
                getCSSCustomProp(COLOR_MODE_KEY) === 'dark' ? 'light' : 'dark';
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
