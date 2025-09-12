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
        this.unitType = document.getElementById('unitType');
        this.unitSize = document.getElementById('unitSize');
        this.unitMove = document.getElementById('unitMove');
        this.unitRole = document.getElementById('unitRole');
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

        // Авто-обновление карточки при изменении полей
        this.bindAutoUpdate();
    }

    bindAutoUpdate() {
        const autoUpdateFields = [
            this.unitName, this.unitVariant, this.unitType, this.unitSize, 
            this.unitMove, this.unitRole, this.unitSkill,
            this.unitPoints, this.armorValue, this.structureValue,
            this.damageS, this.damageM, this.damageL, this.overheatValue,
            this.specialAbilities
        ];

        autoUpdateFields.forEach(field => {
            if (field) {
                field.addEventListener('input', () => {
                    this.generateCard();
                });
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
        const cardData = await getUnitDataFromMul(mulID.value);
        
        document.getElementById('unitName').value = cardData.name;
        document.getElementById('unitVariant').value = cardData.variant;
        document.getElementById('unitType').value = cardData.type;
        document.getElementById('unitSize').value = cardData.size;
        document.getElementById('unitMove').value = cardData.move;
        document.getElementById('unitRole').value = cardData.role;
        document.getElementById('unitSkill').value = cardData.skill;
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
    }

    generateCard() {
        const cardData = this.getCardData();
        const cardHTML = this.createCardHTML(cardData);

        this.cardContainer.innerHTML = cardHTML;
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
        return {
            name: this.unitName.value,
            variant: this.unitVariant.value,
            type: this.unitType.value,
            size: this.unitSize.value,
            tmm: getTmmFromMove(this.unitMove.value),
            move: this.unitMove.value,
            role: this.unitRole.value,
            skill: this.unitSkill.value,
            points: parseInt(this.unitPoints.value) || 0,
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

    createCardHTML(data) {
        const imageHTML = data.imageUrl ? `
        <div class="card-image">
            <img src="${data.imageUrl}" alt="${data.name}">
        </div>
    ` : '<div class="card-image"></div>';

        return `
    <div class="alpha-strike-card" id="alphaStrikeCard">
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
        
        <div class="heat-section">
            <div class="heat-content">
                <div class="heat-item">
                    <div class="heat-value">${data.overheat}</div>
                </div> 
            </div>
        </div>
        
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
