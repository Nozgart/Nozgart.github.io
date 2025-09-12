async function fetchAndParseUnitData(unitId) {
    try {
        // Получаем HTML документ
        const response = await fetch(unitId);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const htmlText = await response.text();
        
        // Создаем временный DOM для парсинга
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        // Парсим данные из формы
        return parseUnitDataFromDocument(doc);
        
    } catch (error) {
        console.error('Error fetching or parsing unit data:', error);
        return null;
    }
}

function getTmmFromMove(move) {
    // Преобразуем входное значение в число
    const numericPart = move.toString().replace(/[^\d]/g, '');
    const moveValue = parseInt(numericPart, 10);
    
    // Проверяем, что значение является числом
    if (isNaN(moveValue)) {
        return 0;
    }
    
    // Используем switch case для определения TMM
    switch (true) {
        case moveValue >= 0 && moveValue <= 4:
            return 0;
        case moveValue >= 5 && moveValue <= 8:
            return 1;
        case moveValue >= 9 && moveValue <= 12:
            return 2;
        case moveValue >= 13 && moveValue <= 18:
            return 3;
        case moveValue >= 19 && moveValue <= 34:
            return 4;
        case moveValue >= 35:
            return 5;
        default:
            // Для значений больше 40 или отрицательных
            return 0;
    }
}

function parseUnitDataFromDocument(doc) {
    const form = doc.querySelector('.col-md-4.col-sm-6');
    if (!form) return null;

    const getValue = (id) => {
        const element = form.querySelector(`#${id}`);
        return element ? element.value : null;
    };

    const getCheckboxValue = (id) => {
        const element = form.querySelector(`#${id}`);
        return element ? element.checked : false;
    };

    const getTextareaValue = (id) => {
        const element = form.querySelector(`#${id}`);
        return element ? element.value : null;
    };

    return {
        name: getValue('Data_Name'),
        variant: getValue('Data_Model'),
        points: getValue('Data_PV'),
        type: getValue('Data_Type'),
        size: getValue('Data_Size'),
        move: getValue('Data_Move'),
        tmm: getTmmFromMove(getValue('Data_Move')),
        role: getValue('Data_Role'),
        skill: getValue('Data_Skill'),
        damageS: getValue('Data_Short'),
        //ShortMin: getCheckboxValue('Data_ShortMin'),
        damageM: getValue('Data_Medium'),
        //MediumMin: getCheckboxValue('Data_MediumMin'),
        damageL: getValue('Data_Long'),
        //LongMin: getCheckboxValue('Data_LongMin'),
        //Extreme: getValue('Data_Extreme'),
        //ExtremeMin: getCheckboxValue('Data_ExtremeMin'),
        overheat: getValue('Data_Overheat'),
        armor: getValue('Data_Armor'),
        structure: getValue('Data_Structure'),
        //Threshold: getValue('Data_Threshold'),
        specialAbilities: getTextareaValue('Data_Specials'),
        imageUrl: getTextareaValue('Data_Image')
    };
}

// Функция для парсинга текущего документа (если нужно)
function parseCurrentUnitData() {
    return parseUnitDataFromDocument(document);
}

// Использование
async function getUnitDataFromMul(unitId) {
    const unitData = await fetchAndParseUnitData(unitId);
    console.log(JSON.stringify(unitData, null, 2));
    return unitData;
}

// Пример использования
// getUnitData(3375).then(data => console.log(data));