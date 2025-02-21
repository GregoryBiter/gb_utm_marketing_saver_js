const utmHandler = {
    getUrlParams: () => {
        let params = {}; // Изменено с const на let
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        
        // Перечень UTM меток, которые нужно сохранить
        const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

        utmParams.forEach(param => {
            if (param === 'utm_source') {
                params[param] = urlParams.get(param) || 'direct'; // Устанавливаем 'direct', если utm_source отсутствует
            } else {
                params[param] = urlParams.get(param) || ''; // Устанавливаем пустую строку, если метка отсутствует
            }
        });

        // Если UTM-метка 'utm_source' отсутствует, проверяем специфические параметры и реферер
        params = utmHandler.setUtmSourceFromReferrer(params)
        params = utmHandler.otherUrlParams(params, urlParams);
        return params;
    },

    setUtmSourceFromReferrer: (params) => {
        const referrer = document.referrer;
        const currentDomain = window.location.hostname;

        if (referrer && !referrer.includes(currentDomain)) {
            const refDomain = new URL(referrer).hostname;

            const organicSources = {
                'google.com': { source: 'google', medium: 'organic' },
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

            if (!params['utm_source']) {
                if (organicSources[refDomain]) {
                    params['utm_source'] = organicSources[refDomain].source;
                } else {
                    params['utm_source'] = refDomain;
                }
            }

            if (!params['utm_medium']) {
                if (organicSources[refDomain]) {
                    params['utm_medium'] = organicSources[refDomain].medium;
                } else {
                    params['utm_medium'] = 'referral';
                }
            }
        }
        return params;
    },

    otherUrlParams: (params, urlParams) => {
        // Проверяем наличие специфических параметров fbclid, gclid и другие, если utm_source не задан
        if (!params['utm_source']) {
            if (urlParams.has('fbclid')) {
                params['utm_source'] = 'facebook';
                params['utm_medium'] = 'social';
            } else if (urlParams.has('gclid')) {
                params['utm_source'] = 'google';
                params['utm_medium'] = 'cpc';
            } else if (urlParams.has('dclid')) {
                params['utm_source'] = 'doubleclick';
                params['utm_medium'] = 'display';
            }
        }

        // Если utm_source не был задан явно, проверяем и записываем реферер
        return params;
    },

    setCookie: (name, value, days) => {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    },

    getCookie: (name) => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return null;
    },

    saveUtmAndReferrerToCookies: () => {
        const currentUtmParams = utmHandler.getUrlParams();
        const referrer = document.referrer;
        const currentDomain = window.location.hostname;

        // Получаем существующую куку, если она уже есть
        let cookieData = JSON.parse(utmHandler.getCookie('utm_data') || '{}');

        // Если куки нет, создаем структуру данных
        if (!cookieData.first_visit) {
            cookieData.first_visit = {
                utm: currentUtmParams,
                referrer: referrer && !referrer.includes(currentDomain) ? referrer : '' // Не записываем текущий домен
            };
        }

        // Проверяем, если текущие UTM метки или реферер отличаются от первых, сохраняем их как второй заход
        const firstVisitUtm = cookieData.first_visit.utm;
        const firstVisitReferrer = cookieData.first_visit.referrer;

        if (JSON.stringify(currentUtmParams) !== JSON.stringify(firstVisitUtm) || referrer !== firstVisitReferrer) {
            if (currentUtmParams.utm_source !== 'direct') {
                cookieData.second_visit = {
                    utm: currentUtmParams,
                    referrer: referrer && !referrer.includes(currentDomain) ? referrer : '' // Не записываем текущий домен
                };
            }
        }

        // Сохраняем все в одну куку в формате JSON
        utmHandler.setCookie('utm_data', JSON.stringify(cookieData), 30); // Срок действия куки 30 дней
    },

    getUtmAndReferrerFromCookies: () => {
        try {
            const data = JSON.parse(utmHandler.getCookie('utm_data') || '{}');
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
            console.error('Ошибка при чтении куки:', e);
            return {};
        }
    }
};

// Делаем объект глобальным
window.utmHandler = utmHandler;

// Экспортируем объект для тестирования в Node.js
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = utmHandler;
}

// Сохраняем UTM метки и реферер при загрузке страницы
window.onload = () => {
    if (typeof utmHandler.saveUtmAndReferrerToCookies === 'function') {
        utmHandler.saveUtmAndReferrerToCookies();
        console.log(utmHandler.getUtmAndReferrerFromCookies());
    } else {
        console.error('Функция saveUtmAndReferrerToCookies не определена');
    }
};
