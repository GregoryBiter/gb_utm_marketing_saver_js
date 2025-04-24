/* License: MIT */

'use strict';

/**
 * UTM Handler - модуль для работы с UTM-метками
 */
const utmHandler = (() => {
    // Константы
    const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const DEFAULT_UTM = {
        utm_source: 'direct',
        utm_medium: '(not set)',
        utm_campaign: '(not set)',
        utm_term: '(not set)',
        utm_content: '(not set)'
    };
    const ORGANIC_SOURCES = {
        'google.com': { source: 'google', medium: 'organic' },
        'google.com.ua': { source: 'google', medium: 'organic' },
        'bing.com': { source: 'bing', medium: 'organic' },
        'yahoo.com': { source: 'yahoo', medium: 'organic' },
        'duckduckgo.com': { source: 'duckduckgo', medium: 'organic' },
        'instagram.com': { source: 'instagram', medium: 'social' },
        'l.instagram.com': { source: 'instagram', medium: 'social' },
        'facebook.com': { source: 'facebook', medium: 'social' },
        'l.facebook.com': { source: 'facebook', medium: 'social' },
        'm.facebook.com': { source: 'facebook', medium: 'social' },
        'twitter.com': { source: 'twitter', medium: 'social' },
        'linkedin.com': { source: 'linkedin', medium: 'social' }
    };
    const COOKIE_EXPIRY_DAYS = 30;
    
    // Приватные методы
    const logger = (message, data = null) => {
        // В Node.js process может быть не определен, поэтому добавляем проверку
        try {
            if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
                if (data) {
                    console.log(message, data);
                } else {
                    console.log(message);
                }
            }
        } catch (e) {
            // В случае ошибки просто игнорируем логирование
        }
    };

    const clearHost = (host) => {
        if (!host) return '';
        
        let result = host;
        if (result.indexOf('http://') === 0) {
            result = result.slice(7);
        }
        if (result.indexOf('https://') === 0) {
            result = result.slice(8);
        }
        if (result.indexOf('www.') === 0) {
            result = result.slice(4);
        }
        return result;
    };

    const isExternalReferrer = (referrer, currentDomain) => {
        return referrer && !referrer.includes(currentDomain);
    };

    const getReferrerValue = (referrer, currentDomain) => {
        return isExternalReferrer(referrer, currentDomain) ? referrer : '';
    };

    // Проверяет, является ли строка допустимым URL
    const isValidUrl = (string) => {
        try {
            // Проверяем, есть ли протокол, если нет - добавляем временно для валидации
            let urlToTest = string;
            if (!string.match(/^[a-zA-Z]+:\/\//)) {
                urlToTest = 'http://' + string;
            }
            
            new URL(urlToTest);
            return true;
        } catch (e) {
            return false;
        }
    };

    // Безопасно извлекает домен из URL
    const extractDomainFromUrl = (url) => {
        try {
            // Если URL не содержит протокол, добавляем временно http://
            let urlWithProtocol = url;
            if (!url.match(/^[a-zA-Z]+:\/\//)) {
                urlWithProtocol = 'http://' + url;
            }
            
            const domainFromUrl = new URL(urlWithProtocol).hostname;
            return clearHost(domainFromUrl);
        } catch (e) {
            // Если не можем распарсить URL, пытаемся извлечь домен вручную
            logger('Не удалось распарсить URL, пытаемся извлечь домен вручную:', url);
            
            // Удаляем протокол, если есть
            let domain = url.replace(/^(https?:\/\/)?(www\.)?/i, '');
            
            // Берем первую часть до слеша или знака вопроса
            domain = domain.split(/[/?#]/)[0];
            
            return domain || '';
        }
    };

    // Публичное API
    return {
        getUrlParams: () => {
            let params = {...DEFAULT_UTM};
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            
            logger('URL параметры:', urlParams);
            
            // Получаем информацию из реферера до проверки параметров URL
            const referrer = document.referrer;
            if (referrer && referrer.includes('l.instagram.com')) {
                params.utm_source = 'instagram';
                params.utm_medium = 'social';
            }
            
            // Проверяем наличие специфических параметров - они важнее реферера
            params = utmHandler.otherUrlParams(params, urlParams);
            
            // Проверяем реферер только если нет явных UTM-параметров
            if (params.utm_source === 'direct' && !urlParams.has('utm_source')) {
                params = utmHandler.setUtmSourceFromReferrer(params);
            }
            
            // Явно указанные UTM-параметры имеют высший приоритет
            UTM_PARAMS.forEach(param => {
                const value = urlParams.get(param);
                if (value !== null) {
                    params[param] = value;
                }
            });
            
            return params;
        },

        clearHost,

        setUtmSourceFromReferrer: (params) => {
            const referrer = document.referrer;
            logger('referrer:', referrer);
            const currentDomain = window.location.hostname;
            logger('currentDomain:', currentDomain);
            
            // Если нет реферера или это внутренний переход, возвращаем текущие параметры
            if (!referrer || referrer.includes(currentDomain)) {
                return params;
            }
            
            // Специальная обработка для Instagram lite links
            if (referrer.includes('l.instagram.com')) {
                logger('Instagram lite link detected');
                params.utm_source = 'instagram';
                params.utm_medium = 'social';
                return params;
            }
            
            let refDomain = '';
            
            // Безопасное получение домена реферера
            if (!isValidUrl(referrer)) {
                logger('Некорректный URL реферера:', referrer);
                // Важно: для некорректных URL не меняем utm_source, оставляем как есть (обычно 'direct')
                return params;
            }
            
            try {
                refDomain = extractDomainFromUrl(referrer);
                logger('Извлеченный домен реферера:', refDomain);
                
                if (!refDomain) {
                    logger('Не удалось извлечь домен из реферера');
                    return params;
                }
            } catch (e) {
                logger('Ошибка при парсинге реферрера:', e);
                return params;
            }

            // Обработка особых случаев
            if (referrer.includes('google.com/search')) {
                logger('Google search detected in referrer URL');
                params.utm_source = 'google';
                params.utm_medium = 'organic';
                return params;
            }

            if (params.utm_source === 'direct') {
                logger('Looking for source match for domain:', refDomain);
                
                // Прямое сравнение с доменами из списка
                if (ORGANIC_SOURCES[refDomain]) {
                    params.utm_source = ORGANIC_SOURCES[refDomain].source;
                    params.utm_medium = ORGANIC_SOURCES[refDomain].medium || '(not set)';
                    logger('Direct match found:', refDomain, '->', params.utm_source, params.utm_medium);
                } else {
                    // Проверка на поддомены
                    let isKnownSource = false;
                    
                    for (const [domain, data] of Object.entries(ORGANIC_SOURCES)) {
                        if (refDomain === domain || refDomain.endsWith('.' + domain)) {
                            params.utm_source = data.source;
                            params.utm_medium = data.medium || '(not set)';
                            isKnownSource = true;
                            logger('Domain/subdomain match found:', refDomain, '->', params.utm_source, params.utm_medium);
                            break;
                        }
                    }
                    
                    // Если не найдено соответствие, устанавливаем реферральный трафик
                    // с условием, что домен не является пустым и корректен
                    if (!isKnownSource && refDomain && refDomain !== 'invalid-url') {
                        params.utm_source = refDomain;
                        params.utm_medium = 'referral';
                        logger('No match found, set as referral:', refDomain);
                    }
                    // В противном случае оставляем source как "direct"
                }
            }
            
            return params;
        },

        otherUrlParams: (params, urlParams) => {
            // Проверяем наличие специфических параметров
            if (!params.utm_source || params.utm_source === 'direct') {
                if (urlParams.has('fbclid')) {
                    params.utm_source = 'facebook';
                    params.utm_medium = 'social';
                } else if (urlParams.has('gclid')) {
                    params.utm_source = 'google';
                    params.utm_medium = 'cpc';
                } else if (urlParams.has('dclid')) {
                    params.utm_source = 'doubleclick';
                    params.utm_medium = 'display';
                } else if (urlParams.has('gad_source')) {
                    params.utm_source = 'google';
                    params.utm_medium = 'cpc';
                }
            }

            return params;
        },

        setCookie: (name, value, days = COOKIE_EXPIRY_DAYS) => {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Lax`;
        },

        getCookie: (name) => {
            if (!document.cookie) return null;
            
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i].trim();
                if (c.indexOf(nameEQ) === 0) {
                    const rawValue = c.substring(nameEQ.length);
                    // Проверяем, пустое ли значение
                    if (!rawValue) return null;
                    return rawValue;
                }
            }
            return null;
        },

        isExternalReferrer,

        getReferrerValue,

        shouldUpdateSecondVisit: (currentUtmParams, referrer, currentDomain) => {
            // Если источник не direct - всегда обновляем
            if (currentUtmParams.utm_source !== 'direct') {
                return true;
            }
            
            // Для direct источника проверяем наличие внешнего реферера
            // Обеспечиваем, что функция всегда возвращает boolean значение
            return Boolean(isExternalReferrer(referrer, currentDomain));
        },

        getUtmAndReferrerFromCookies: () => {
            try {
                const cookieValue = utmHandler.getCookie('utm_data');
                
                // Проверка на null, undefined или пустую строку
                if (!cookieValue) {
                    logger('Cookie utm_data отсутствует или пустая');
                    return {};
                }
                
                // Проверяем, что значение начинается с {, что указывает на JSON объект
                if (!cookieValue.trim().startsWith('{')) {
                    logger('Cookie utm_data содержит некорректные данные:', cookieValue);
                    return {};
                }
                
                const data = JSON.parse(cookieValue);
                
                if (!data.first_visit || !data.first_visit.utm) {
                    // Если first_visit отсутствует, но есть second_visit, заполняем first_visit данными second_visit
                    if (data.second_visit) {
                        data.first_visit = data.second_visit;
                    } else {
                        return {};
                    }
                }
                return data;
            } catch (e) {
                logger('Ошибка при чтении куки:', e);
                // Очищаем некорректную куку
                try {
                    utmHandler.setCookie('utm_data', '{}');
                    logger('Некорректная кука utm_data была сброшена');
                } catch (resetError) {
                    logger('Не удалось сбросить некорректную куку:', resetError);
                }
                return {};
            }
        },

        saveUtmAndReferrerToCookies: () => {
            try {
                const currentUtmParams = utmHandler.getUrlParams();
                const referrer = document.referrer;
                const currentDomain = window.location.hostname;

                // Получаем существующую куку, если она уже есть
                let cookieData = {};
                const existingCookie = utmHandler.getCookie('utm_data');
                
                if (existingCookie) {
                    try {
                        // Проверяем, что значение является JSON объектом
                        if (existingCookie.trim().startsWith('{')) {
                            cookieData = JSON.parse(existingCookie);
                        }
                    } catch (e) {
                        logger('Ошибка при чтении куки, создаем новую', e);
                    }
                }

                // Если куки нет или она некорректна, создаем структуру данных
                if (!cookieData.first_visit) {
                    cookieData.first_visit = {
                        utm: currentUtmParams,
                        referrer: getReferrerValue(referrer, currentDomain),
                        timestamp: new Date().toISOString()
                    };
                }

                // Проверяем и обновляем данные второго визита, если необходимо
                if (utmHandler.shouldUpdateSecondVisit(currentUtmParams, referrer, currentDomain)) {
                    cookieData.second_visit = {
                        utm: currentUtmParams,
                        referrer: getReferrerValue(referrer, currentDomain),
                        timestamp: new Date().toISOString()
                    };
                }

                // Сохраняем все в одну куку в формате JSON
                utmHandler.setCookie('utm_data', JSON.stringify(cookieData));
            } catch (e) {
                logger('Ошибка при сохранении UTM данных', e);
                // В случае ошибки инициализируем куку пустым объектом
                try {
                    utmHandler.setCookie('utm_data', '{}');
                } catch (resetError) {
                    logger('Не удалось сбросить куку:', resetError);
                }
            }
        }
    };
})();

// Делаем объект глобальным
window.utmHandler = utmHandler;

// Экспортируем объект для тестирования в Node.js
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = utmHandler;
}

// Сохраняем UTM метки и реферер при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (typeof utmHandler.saveUtmAndReferrerToCookies === 'function') {
        utmHandler.saveUtmAndReferrerToCookies();
        console.log('UTM данные:', utmHandler.getUtmAndReferrerFromCookies());
    } else {
        console.error('Функция saveUtmAndReferrerToCookies не определена');
    }
});
