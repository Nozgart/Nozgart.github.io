async function fetchAndParseUnitData(unitId) {
    try {
        // Получаем HTML документ
        const response = await fetch(`http://masterunitlist.info/Tools/CustomCard/${unitId}`);
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
        Name: getValue('Data_Name'),
        Model: getValue('Data_Model'),
        PV: getValue('Data_PV'),
        Type: getValue('Data_Type'),
        Size: getValue('Data_Size'),
        Move: getValue('Data_Move'),
        Role: getValue('Data_Role'),
        Skill: getValue('Data_Skill'),
        Short: getValue('Data_Short'),
        ShortMin: getCheckboxValue('Data_ShortMin'),
        Medium: getValue('Data_Medium'),
        MediumMin: getCheckboxValue('Data_MediumMin'),
        Long: getValue('Data_Long'),
        LongMin: getCheckboxValue('Data_LongMin'),
        Extreme: getValue('Data_Extreme'),
        ExtremeMin: getCheckboxValue('Data_ExtremeMin'),
        Overheat: getValue('Data_Overheat'),
        Armor: getValue('Data_Armor'),
        Structure: getValue('Data_Structure'),
        Threshold: getValue('Data_Threshold'),
        Specials: getTextareaValue('Data_Specials'),
        Image: getTextareaValue('Data_Image')
    };
}

// Функция для парсинга текущего документа (если нужно)
function parseCurrentUnitData() {
    return parseUnitDataFromDocument(document);
}

// Использование
async function getUnitData(unitId) {
    const unitData = await fetchAndParseUnitData(unitId);
    console.log(JSON.stringify(unitData, null, 2));
    return unitData;
}

// Пример использования
// getUnitData(3375).then(data => console.log(data));