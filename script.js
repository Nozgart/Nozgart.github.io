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

/**
 * Целевой размер карточки в Word (см): 8,90 × 6,30.
 * 635 давало 6,29×8,69 — чуть уменьшаем DPI, чтобы вышло 6,30×8,90.
 */
const CARD_EXPORT_DPI = 620;

/** CRC32 для PNG-chunk (таблица один раз). */
function getCrc32Table() {
    if (window.__pngCrc32Table) return window.__pngCrc32Table;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c;
    }
    window.__pngCrc32Table = t;
    return t;
}
function crc32(data, start, length) {
    const table = getCrc32Table();
    let crc = 0xffffffff;
    for (let i = 0; i < length; i++) crc = table[(crc ^ data[start + i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Вставляет в PNG chunk pHYs (DPI), чтобы в Word карточка была 8,90×6,30 см.
 * @param {ArrayBuffer} pngBuffer
 * @param {number} dpi
 * @returns {ArrayBuffer}
 */
function setPngDpi(pngBuffer, dpi) {
    if (pngBuffer.byteLength < 33) return pngBuffer;
    const ppm = Math.round((dpi * 100) / 2.54);
    const typeAndData = new Uint8Array(13);
    typeAndData[0] = 0x70;
    typeAndData[1] = 0x48;
    typeAndData[2] = 0x59;
    typeAndData[3] = 0x73;
    typeAndData[4] = (ppm >>> 24) & 0xff;
    typeAndData[5] = (ppm >>> 16) & 0xff;
    typeAndData[6] = (ppm >>> 8) & 0xff;
    typeAndData[7] = ppm & 0xff;
    typeAndData[8] = (ppm >>> 24) & 0xff;
    typeAndData[9] = (ppm >>> 16) & 0xff;
    typeAndData[10] = (ppm >>> 8) & 0xff;
    typeAndData[11] = ppm & 0xff;
    typeAndData[12] = 1;
    const crc = crc32(typeAndData, 0, 13);
    const chunk = new ArrayBuffer(21);
    const c = new DataView(chunk);
    c.setUint32(0, 9, false);
    c.setUint32(4, 0x70485973, false);
    c.setUint32(8, ppm, false);
    c.setUint32(12, ppm, false);
    c.setUint8(16, 1);
    c.setUint32(17, crc, false);
    const out = new ArrayBuffer(pngBuffer.byteLength + 21);
    const outArr = new Uint8Array(out);
    outArr.set(new Uint8Array(pngBuffer, 0, 33), 0);
    outArr.set(new Uint8Array(chunk), 33);
    outArr.set(new Uint8Array(pngBuffer, 33), 54);
    return out;
}

/** Логотипы эр на карточке: порядок по номеру в имени файла (1, 2, …). */
const ERA_IMAGES = [
    'data/1_StarLeagule_dark.png',
    'data/2_SuccessionWar_dark.png',
    'data/3_ClanInvasion_dark.png',
    'data/4_CivilWar_dark.png',
    'data/5_Jihad_dark.png',
    'data/6_DarkAge_dark.png',
    'data/7_ilClan_dark.png'
];

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
        // Доступные эпохи
        this.eraCheckboxes = [1, 2, 3, 4, 5, 6, 7].map(n => document.getElementById('era' + n));
        this.showErasOnCard = document.getElementById('showErasOnCard');

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

        this.eraCheckboxes.forEach(cb => {
            if (cb) cb.addEventListener('change', () => this.generateCard());
        });
        if (this.showErasOnCard) {
            this.showErasOnCard.addEventListener('change', () => this.generateCard());
        }

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
        // TP: BM/IM/PM/BA/CI или «Другое» + своё значение
        const typeSelect = document.getElementById('unitTypeSelect');
        const typeCustom = document.getElementById('unitTypeCustom');
        const knownTypes = ['BM', 'IM', 'PM', 'BA', 'CI'];
        if (knownTypes.includes(cardData.type)) {
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
            imageUrl: this.currentImageUrl,
            showEras: this.showErasOnCard ? this.showErasOnCard.checked : true,
            availableEras: this.eraCheckboxes.map(cb => cb ? cb.checked : false)
        };
    }

    isInfantryCard(type) {
        const t = (type || '').toString().trim().toUpperCase();
        const mechTypes = ['BM', 'IM', 'PM'];
        return !mechTypes.includes(t);
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
        ${data.showEras ? `
        <div class="card-era-strip" aria-hidden="true">
            ${ERA_IMAGES.map((path, i) => {
            const available = data.availableEras && data.availableEras[i];
            return `<img src="${path}" alt="" class="card-era-icon card-era-icon-${i + 1}${available ? ' card-era-available' : ''}">`;
        }).join('')}
        </div>
        ` : ''}
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

    /**
     * Применяет к контексту canvas эффект иконки эпохи (белая или тёмная).
     * html2canvas не сохраняет CSS filter при экспорте, поэтому подменяем картинки в onclone.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w
     * @param {number} h
     * @param {boolean} available — true = белая (available), false = тёмная (как в CSS)
     */
    applyEraIconFilterToContext(ctx, w, h, available) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const value = available ? Math.round(255 * 0.85) : Math.round(255 * 0.15); // белая 217 / тёмная 38
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                data[i] = value;
                data[i + 1] = value;
                data[i + 2] = value;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    exportCardToImage(cardElement) {
        const originalCard = cardElement;
        const generator = this;
        html2canvas(originalCard, {
            backgroundColor: null,
            scale: 3,
            logging: false,
            useCORS: true,
            onclone(clonedDoc, clonedElement) {
                const clonedCard = clonedDoc.getElementById('alphaStrikeCard') || clonedElement;
                const originalEraIcons = originalCard.querySelectorAll('img.card-era-icon');
                const clonedEraIcons = clonedCard.querySelectorAll('img.card-era-icon');
                originalEraIcons.forEach((origImg, index) => {
                    const cloneImg = clonedEraIcons[index];
                    if (!cloneImg || !origImg.complete) return;
                    const w = origImg.naturalWidth || origImg.width;
                    const h = origImg.naturalHeight || origImg.height;
                    if (!w || !h) return;
                    const canvas = clonedDoc.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(origImg, 0, 0);
                    const available = origImg.classList.contains('card-era-available');
                    generator.applyEraIconFilterToContext(ctx, w, h, available);
                    cloneImg.src = canvas.toDataURL('image/png');
                });
            }
        }).then(canvas => {
            canvas.toBlob(blob => {
                const name = `battletech-card-${this.unitVariant.value.toLowerCase().replace(/\s+/g, '-')}-${this.unitName.value.toLowerCase().replace(/\s+/g, '-')}.png`;
                blob.arrayBuffer().then(buf => {
                    const withDpi = setPngDpi(buf, CARD_EXPORT_DPI);
                    const link = document.createElement('a');
                    link.download = name;
                    link.href = URL.createObjectURL(new Blob([withDpi], { type: 'image/png' }));
                    link.click();
                    URL.revokeObjectURL(link.href);
                });
            }, 'image/png');
        });
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const generator = new CardGenerator();
});
