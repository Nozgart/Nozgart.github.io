/**
 * Модификатор PV за один шаг при УМЕНЬШЕНИИ скилла (skill < 4).
 * 0–7 → 1; 8–12 → 2; далее +1 за каждые 5 очков; с 48 — база 10, +1 за каждые 5.
 */
function getPVModifierPerStep(basePV) {
    const pv = Math.max(0, parseInt(basePV, 10) || 0);
    if (pv <= 7) return 1;
    if (pv < 48) return 2 + Math.floor((pv - 8) / 5);
    return 10 + Math.floor((pv - 48) / 5);
}

/**
 * Снижение PV за один шаг при УВЕЛИЧЕНИИ скилла (skill > 4).
 * 0–14 → 1; 15–24 → 2; далее +1 за каждые 10 очков.
 */
function getPVReductionPerStep(basePV) {
    const pv = Math.max(0, parseInt(basePV, 10) || 0);
    if (pv <= 14) return 1;
    return 1 + Math.floor((pv - 5) / 10);
}

/**
 * Отображаемая очковая стоимость: базовая PV (при скилле 4) + поправка за скилл.
 * Скилл 4 = базовая стоимость.
 * Скилл < 4 — дороже (таблица увеличения).
 * Скилл > 4 — дешевле (отдельная таблица снижения).
 */
function getDisplayPV(basePV, skill) {
    const base = parseInt(basePV, 10) || 0;
    let sk = parseInt(skill, 10);
    if (isNaN(sk)) return base;
    sk = Math.max(0, Math.min(7, sk));
    if (sk === 4) return base;
    let displayed;
    if (sk < 4) {
        const stepsDown = 4 - sk;
        const modifier = getPVModifierPerStep(base);
        displayed = base + stepsDown * modifier;
    } else {
        const stepsUp = sk - 4;
        const reduction = getPVReductionPerStep(base);
        displayed = base - stepsUp * reduction;
    }
    return Math.max(0, Math.round(displayed));
}

class CardGenerator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentImageUrl = null;
        this.generateCard();
    }

    initializeElements() {
        // Основные поля
        this.unitName = document.getElementById('unitName');
        this.unitVariant = document.getElementById('unitVariant');
        this.unitTypeSelect = document.getElementById('unitTypeSelect');
        this.unitTypeCustom = document.getElementById('unitTypeCustom');
        this.unitSize = document.getElementById('unitSize');
        this.unitMove = document.getElementById('unitMove');
        this.unitRoleSelect = document.getElementById('unitRoleSelect');
        this.unitRoleCustom = document.getElementById('unitRoleCustom');
        this.unitSkill = document.getElementById('unitSkill');

        // Очковая стоимость
        this.unitPoints = document.getElementById('unitPoints');

        // Броня и структура
        this.armorValue = document.getElementById('armorValue');
        this.structureValue = document.getElementById('structureValue');

        // Урон
        this.damageS = document.getElementById('damageS');
        this.damageM = document.getElementById('damageM');
        this.damageL = document.getElementById('damageL');

        // Тепло
        this.overheatValue = document.getElementById('overheatValue');

        // Изображение
        this.imageUrl = document.getElementById('imageUrl');
        this.imageUpload = document.getElementById('imageUpload');
        this.imagePreview = document.getElementById('imagePreview');

        // Способности
        this.specialAbilities = document.getElementById('specialAbilities');
        // Mul ID
        this.mulID = document.getElementById('mulID');

        // Кнопки
        this.generateBtn = document.getElementById('generateBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.exportMul = document.getElementById('exportMul');

        // Контейнер
        this.cardContainer = document.getElementById('cardContainer');
    }

    bindEvents() {
        this.generateBtn.addEventListener('click', () => this.generateCard());
        this.exportBtn.addEventListener('click', () => this.exportCard());
        this.exportMul.addEventListener('click', () => this.generateCardfromMUL());

        // Обработка изображений
        this.imageUrl.addEventListener('change', () => this.handleImageUrlChange());
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));

        // TP: показ поля «Другое»
        this.unitTypeSelect.addEventListener('change', () => {
            const isOther = this.unitTypeSelect.value === '__other__';
            this.unitTypeCustom.style.display = isOther ? 'block' : 'none';
            if (!isOther) this.unitTypeCustom.value = '';
            this.generateCard();
        });
        this.unitTypeCustom.addEventListener('input', () => this.generateCard());

        // Role: показ поля «Другое»
        this.unitRoleSelect.addEventListener('change', () => {
            const isOther = this.unitRoleSelect.value === '__other__';
            this.unitRoleCustom.style.display = isOther ? 'block' : 'none';
            if (!isOther) this.unitRoleCustom.value = '';
            this.generateCard();
        });
        this.unitRoleCustom.addEventListener('input', () => this.generateCard());

        // Авто-обновление карточки при изменении полей
        this.bindAutoUpdate();
    }

    bindAutoUpdate() {
        const autoUpdateFields = [
            this.unitName, this.unitVariant, this.unitTypeSelect, this.unitTypeCustom,
            this.unitSize, this.unitMove, this.unitRoleSelect, this.unitRoleCustom,
            this.unitSkill,
            this.unitPoints, this.armorValue, this.structureValue,
            this.damageS, this.damageM, this.damageL, this.overheatValue,
            this.specialAbilities
        ];

        autoUpdateFields.forEach(field => {
            if (field) {
                field.addEventListener('input', () => this.generateCard());
                field.addEventListener('change', () => this.generateCard());
            }
        });
    }

    handleImageUrlChange() {
        const url = this.imageUrl.value.trim();
        console.info(url);
        if (url) {
            this.loadImageFromUrl(url);
        } else {
            this.clearImagePreview();
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentImageUrl = e.target.result;
                this.showImagePreview(this.currentImageUrl);
                this.imageUrl.value = ''; // Очищаем поле URL
                this.generateCard();
            };
            reader.readAsDataURL(file);
        }
    }

    loadImageFromUrl(url) {
        // Создаем изображение для проверки
        const testImage = new Image();
        testImage.onload = () => {
            this.currentImageUrl = url;
            this.showImagePreview(url);
            this.imageUpload.value = ''; // Очищаем поле загрузки файла
            this.generateCard();
        };
        testImage.onerror = () => {
            alert('Failed to load image from the specified link');
            this.clearImagePreview();
        };
        testImage.src = url;
    }

    showImagePreview(url) {
        this.imagePreview.innerHTML = `<img src="${url}" alt="Preview">`;
    }

    clearImagePreview() {
        this.currentImageUrl = null;
        this.imagePreview.innerHTML = '<span>Image Preview</span>';
        this.generateCard();
    }
    
    async generateCardfromMUL() {
        const id = (mulID && mulID.value && String(mulID.value).trim()) || '';
        if (!id) {
            alert('Enter the MUL ID (number) in the Mul ID field.');
            return;
        }
        const overlay = document.getElementById('mulLoadingOverlay');
        if (overlay) {
            overlay.classList.add('is-visible');
            overlay.setAttribute('aria-hidden', 'false');
        }
        try {
            const cardData = await getUnitDataFromMul(id);
            if (!cardData) {
                alert(
                    'Failed to load data from Master Unit List.\n\n' +
                    '• Check that the MUL ID is correct.\n' +
                    '• The browser may be blocking the request to MUL. Allow access to masterunitlist.info (in the certificate warning or in settings) — the button should then load data.'
                );
                return;
            }
            document.getElementById('unitName').value = cardData.name;
        document.getElementById('unitVariant').value = cardData.variant;
        // TP: BM/BA или «Другое» + своё значение
        const typeSelect = document.getElementById('unitTypeSelect');
        const typeCustom = document.getElementById('unitTypeCustom');
        if (cardData.type === 'BM' || cardData.type === 'BA') {
            typeSelect.value = cardData.type;
            typeCustom.style.display = 'none';
            typeCustom.value = '';
        } else {
            typeSelect.value = '__other__';
            typeCustom.style.display = 'block';
            typeCustom.value = cardData.type || '';
        }
        document.getElementById('unitSize').value = cardData.size;
        document.getElementById('unitMove').value = cardData.move;
        // Role: из списка или «Другое»
        const roleSelect = document.getElementById('unitRoleSelect');
        const roleCustom = document.getElementById('unitRoleCustom');
        const roleOptions = ['Ambusher','Attack','Brawler','Dogfighter','Fast Dogfighter','Fire-Support','Interceptor','Juggernaut','Missile Boat','None','Scout','Skirmisher','Sniper','Striker','Transport'];
        if (roleOptions.includes(cardData.role)) {
            roleSelect.value = cardData.role;
            roleCustom.style.display = 'none';
            roleCustom.value = '';
        } else {
            roleSelect.value = '__other__';
            roleCustom.style.display = 'block';
            roleCustom.value = cardData.role || '';
        }
        const skillVal = cardData.skill;
        document.getElementById('unitSkill').value = Math.max(0, Math.min(7, parseInt(skillVal, 10) || 4));
        document.getElementById('unitPoints').value = cardData.points;
        document.getElementById('armorValue').value = cardData.armor;
        document.getElementById('structureValue').value = cardData.structure;
        document.getElementById('damageS').value = cardData.damageS;
        document.getElementById('damageM').value = cardData.damageM;
        document.getElementById('damageL').value = cardData.damageL;
        document.getElementById('overheatValue').value = cardData.overheat;
        document.getElementById('imageUrl').value = cardData.imageUrl;
        document.getElementById('specialAbilities').value = cardData.specialAbilities;

        this.handleImageUrlChange();
        this.generateCard();
        } finally {
            if (overlay) {
                overlay.classList.remove('is-visible');
                overlay.setAttribute('aria-hidden', 'true');
            }
        }
    }

    generateCard() {
        const cardData = this.getCardData();
        const cardHTML = this.createCardHTML(cardData);

        this.cardContainer.innerHTML = cardHTML;
        requestAnimationFrame(() => this.scaleSpecialAbilitiesFont());
    }

    /** Уменьшает шрифт в блоке SPECIAL, если текст не помещается. */
    scaleSpecialAbilitiesFont() {
        const card = document.getElementById('alphaStrikeCard');
        if (!card) return;
        const container = card.querySelector('.special-abilities');
        const textEl = card.querySelector('.abilities-value');
        if (!container || !textEl) return;

        const maxFontSize = 20;
        const minFontSize = 10;
        let fontSize = maxFontSize;

        textEl.style.fontSize = `${fontSize}px`;
        while (fontSize > minFontSize) {
            const overflows = textEl.scrollHeight > container.clientHeight || textEl.scrollWidth > container.clientWidth;
            if (!overflows) break;
            fontSize -= 2;
            textEl.style.fontSize = `${fontSize}px`;
        }
    }

    formatDamageValue(value) {
        const hasStar = value.includes('*');
        const numericValue = value.replace('*', '');

        if (hasStar) {
            return `<span class="damage-value has-star">${numericValue}*</span>`;
        }
        return `<span class="damage-value">${numericValue}</span>`;
    }

    generateCircles(count, max, isStructure = false) {
        if (count <= 0) return '';

        let html = '';
        const maxPerRow = 20;
        const rows = Math.ceil(count / maxPerRow);

        for (let row = 0; row < rows; row++) {
            const circlesInRow = Math.min(count - row * maxPerRow, maxPerRow);
            for (let i = 0; i < circlesInRow; i++) {
                html += `<div class="circle-item ${isStructure ? 'structure' : ''}"></div>`;
            }
            if (row < rows - 1) {
                html += '<br>';
            }
        }
        return html;
    }

    getCardData() {
        const type = this.unitTypeSelect.value === '__other__' ? this.unitTypeCustom.value : this.unitTypeSelect.value;
        const role = this.unitRoleSelect.value === '__other__' ? this.unitRoleCustom.value : this.unitRoleSelect.value;
        const basePV = parseInt(this.unitPoints.value, 10) || 0;
        const skill = this.unitSkill.value;
        const points = getDisplayPV(basePV, skill);
        return {
            name: this.unitName.value,
            variant: this.unitVariant.value,
            type: type,
            size: this.unitSize.value,
            tmm: getTmmFromMove(this.unitMove.value),
            move: this.unitMove.value,
            role: role,
            skill: skill,
            points: points,
            armor: parseInt(this.armorValue.value) || 0,
            structure: parseInt(this.structureValue.value) || 0,
            damageS: this.damageS.value,
            damageM: this.damageM.value,
            damageL: this.damageL.value,
            overheat: this.overheatValue.value,
            specialAbilities: this.specialAbilities.value,
            imageUrl: this.currentImageUrl
        };
    }

    isInfantryCard(type) {
        const t = (type || '').toString().trim().toUpperCase();
        return t === 'BA';
    }

    createCardHTML(data) {
        const isInfantry = this.isInfantryCard(data.type);
        const cardClass = 'alpha-strike-card' + (isInfantry ? ' infantry' : '');

        const imageHTML = data.imageUrl ? `
        <div class="card-image">
            <img src="${data.imageUrl}" alt="${data.name}">
        </div>
    ` : '<div class="card-image"></div>';

        const heatSectionHTML = isInfantry ? '' : `
        <div class="heat-section">
            <div class="heat-content">
                <div class="heat-item">
                    <div class="heat-value">${data.overheat}</div>
                </div> 
            </div>
        </div>
        `;

        return `
    <div class="${cardClass}" id="alphaStrikeCard">
        <div class="card-header">
            <div class="unit-name">${data.name}</div>
            <div class="unit-variant">${data.variant}</div>
            <div class="points-badge">${data.points}</div>
        </div>
        
        <div class="unit-stats">
            <div class="stat-item tp">
                <div class="stat-value">${data.type}</div>
            </div>
            <div class="stat-item sz">
                <div class="stat-value">${data.size}</div>
            </div>
            <div class="stat-item tmm">
                <div class="stat-value">${data.tmm}</div>
            </div>
            <div class="stat-item mv">
                <div class="stat-value">${data.move}</div>
            </div>
            <div class="stat-item role">
                <div class="stat-value">${data.role}</div>
            </div>
            <div class="stat-item skill">
                <div class="stat-value">${data.skill}</div>
            </div>
        </div>
        
        <div class="damage-section">
            <div class="damage-values">
                <div>
                    ${this.formatDamageValue(data.damageS)}
                </div>
                <div>
                    ${this.formatDamageValue(data.damageM)}
                </div>
                <div>
                    ${this.formatDamageValue(data.damageL)}
                </div>
            </div>
        </div>
        ${heatSectionHTML}
        <div class="armor-section">
            <div class="circle-group">
                <div class="circles-container">
                    ${this.generateCircles(data.armor, 20, false)}
                </div>
            </div>
        </div>
        <div class="structure-section">
            <div class="circle-group">
                <div class="circles-container">
                    ${this.generateCircles(data.structure, 20, true)}
                </div>
            </div>
        </div>

        <div class="special-abilities">
            <div class="abilities-value">${data.specialAbilities}</div>
        </div>
        
        ${imageHTML}
    </div>
`;
    }

    exportCard() {
        const cardElement = document.getElementById('alphaStrikeCard');

        if (!cardElement) {
            alert('Generate card first!');
            return;
        }

        // Для корректного экспорта изображений нужно дождаться их загрузки
        const images = cardElement.querySelectorAll('img');
        let imagesLoaded = 0;

        if (images.length === 0) {
            this.exportCardToImage(cardElement);
            return;
        }

        images.forEach(img => {
            if (img.complete) {
                imagesLoaded++;
            } else {
                img.onload = () => {
                    imagesLoaded++;
                    if (imagesLoaded === images.length) {
                        this.exportCardToImage(cardElement);
                    }
                };
            }
        });

        if (imagesLoaded === images.length) {
            this.exportCardToImage(cardElement);
        }
    }

    exportCardToImage(cardElement) {
        html2canvas(cardElement, {
            backgroundColor: null,
            scale: 3,
            logging: false,
            useCORS: true // Важно для загрузки изображений с других доменов
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `battletech-card-${this.unitVariant.value.toLowerCase().replace(/\s+/g, '-')}-${this.unitName.value.toLowerCase().replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const generator = new CardGenerator();
});
