const utmHandler = require('../src/utm.js');

describe('utmHandler', () => {
    beforeEach(() => {
        // Очистка куки перед каждым тестом
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Установка дефолтных значений для window.location
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                hostname: 'example.com'
            },
            writable: true
        });
        
        // Сброс реферрера
        Object.defineProperty(document, 'referrer', {
            value: '',
            writable: true
        });
    });

    test('getUrlParams should return correct UTM parameters', () => {
        const search = '?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign&utm_term=test_term&utm_content=test_content';
        Object.defineProperty(window, 'location', {
            value: {
                search: search
            },
            writable: true
        });

        const params = utmHandler.getUrlParams();
        expect(params).toEqual({
            utm_source: 'google',
            utm_medium: 'cpc',
            utm_campaign: 'test_campaign',
            utm_term: 'test_term',
            utm_content: 'test_content'
        });
    });

    test('setCookie and getCookie should work correctly', () => {
        utmHandler.setCookie('test_cookie', 'test_value', 1);
        const value = utmHandler.getCookie('test_cookie');
        expect(value).toBe('test_value');
    });

    test('saveUtmAndReferrerToCookies should save UTM parameters and referrer to cookies', () => {
        const search = '?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign&utm_term=test_term&utm_content=test_content';
        Object.defineProperty(window, 'location', {
            value: {
                search: search,
                hostname: 'example.com'
            },
            writable: true
        });

        Object.defineProperty(document, 'referrer', {
            value: 'https://referrer.com',
            writable: true
        });

        utmHandler.saveUtmAndReferrerToCookies();
        const cookieData = JSON.parse(utmHandler.getCookie('utm_data'));
        expect(cookieData.first_visit.utm).toEqual({
            utm_source: 'google',
            utm_medium: 'cpc',
            utm_campaign: 'test_campaign',
            utm_term: 'test_term',
            utm_content: 'test_content'
        });
        expect(cookieData.first_visit.referrer).toBe('https://referrer.com');
    });

    test('saveUtmAndReferrerToCookies should save second visit UTM parameters and referrer to cookies', () => {
        // Первый заход
        let search = '?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign&utm_term=test_term&utm_content=test_content';
        Object.defineProperty(window, 'location', {
            value: {
                search: search,
                hostname: 'example.com'
            },
            writable: true
        });

        Object.defineProperty(document, 'referrer', {
            value: 'https://referrer.com',
            writable: true
        });

        utmHandler.saveUtmAndReferrerToCookies();

        // Второй заход с другими UTM метками
        search = '?utm_source=bing&utm_medium=organic&utm_campaign=second_campaign&utm_term=second_term&utm_content=second_content';
        Object.defineProperty(window, 'location', {
            value: {
                search: search,
                hostname: 'example.com'
            },
            writable: true
        });

        Object.defineProperty(document, 'referrer', {
            value: 'https://another-referrer.com',
            writable: true
        });

        utmHandler.saveUtmAndReferrerToCookies();

        const cookieData = JSON.parse(utmHandler.getCookie('utm_data'));
        expect(cookieData.second_visit.utm).toEqual({
            utm_source: 'bing',
            utm_medium: 'organic',
            utm_campaign: 'second_campaign',
            utm_term: 'second_term',
            utm_content: 'second_content'
        });
        expect(cookieData.second_visit.referrer).toBe('https://another-referrer.com');
    });

    test('getUtmAndReferrerFromCookies should return correct data from cookies', () => {
        const cookieData = {
            first_visit: {
                utm: {
                    utm_source: 'google',
                    utm_medium: 'cpc',
                    utm_campaign: 'test_campaign',
                    utm_term: 'test_term',
                    utm_content: 'test_content'
                },
                referrer: 'https://referrer.com'
            }
        };
        utmHandler.setCookie('utm_data', JSON.stringify(cookieData), 1);
        const data = utmHandler.getUtmAndReferrerFromCookies();
        expect(data).toEqual(cookieData);
    });

    // Тесты для различных источников трафика
    
    test('should correctly identify organic traffic from Google', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.google.com/search?q=test+query',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('google');
        expect(params.utm_medium).toBe('organic');
    });
    
    test('should correctly identify organic traffic from Google.com.ua', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.google.com.ua/search?q=test+query',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('google');
        expect(params.utm_medium).toBe('organic');
    });
    
    test('should correctly identify organic traffic from Bing', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.bing.com/search?q=test+query',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('bing');
        expect(params.utm_medium).toBe('organic');
    });
    
    test('should correctly identify organic traffic from Yahoo', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://search.yahoo.com/search?p=test+query',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('yahoo');
        expect(params.utm_medium).toBe('organic');
    });
    
    test('should correctly identify organic traffic from DuckDuckGo', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://duckduckgo.com/?q=test+query',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('duckduckgo');
        expect(params.utm_medium).toBe('organic');
    });
    
    // Тесты для социальных сетей
    
    test('should correctly identify traffic from Instagram', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.instagram.com/p/somepost/',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('instagram');
        expect(params.utm_medium).toBe('social');
    });
    
    test('should correctly identify traffic from Instagram lite links', () => {
        // Очищаем куки заново для этого теста
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        Object.defineProperty(document, 'referrer', {
            value: 'https://l.instagram.com/?u=https%3A%2F%2Fexample.com',
            writable: true
        });
        
        // Делаем явный вызов getUrlParams для теста
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('instagram');
        expect(params.utm_medium).toBe('social');
    });
    
    test('should correctly identify traffic from Facebook', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.facebook.com/somepage',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('facebook');
        expect(params.utm_medium).toBe('social');
    });
    
    test('should correctly identify traffic from Mobile Facebook', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://m.facebook.com/somepage',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('facebook');
        expect(params.utm_medium).toBe('social');
    });
    
    test('should correctly identify traffic from Twitter', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://twitter.com/sometweeter/status/123456789',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('twitter');
        expect(params.utm_medium).toBe('social');
    });
    
    test('should correctly identify traffic from LinkedIn', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.linkedin.com/feed/',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('linkedin');
        expect(params.utm_medium).toBe('social');
    });
    
    // Тесты для платного трафика
    
    test('should correctly identify Google Ads traffic from gclid parameter', () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?gclid=abc123',
                hostname: 'example.com'
            },
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('google');
        expect(params.utm_medium).toBe('cpc');
    });
    
    test('should correctly identify Google Ads traffic from gad_source parameter', () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?gad_source=abc123',
                hostname: 'example.com'
            },
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('google');
        expect(params.utm_medium).toBe('cpc');
    });
    
    test('should correctly identify Facebook Ads traffic from fbclid parameter', () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?fbclid=abc123',
                hostname: 'example.com'
            },
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('facebook');
        expect(params.utm_medium).toBe('social');
    });
    
    test('should correctly identify DoubleClick traffic from dclid parameter', () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?dclid=abc123',
                hostname: 'example.com'
            },
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('doubleclick');
        expect(params.utm_medium).toBe('display');
    });
    
    // Тесты для реферрального трафика
    
    test('should correctly identify referral traffic', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://some-other-site.com/page',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('some-other-site.com');
        expect(params.utm_medium).toBe('referral');
    });
    
    // Тесты для прямого трафика
    
    test('should correctly identify direct traffic', () => {
        // Нет реферрера и нет UTM-меток = прямой заход
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('direct');
        expect(params.utm_medium).toBe('(not set)');
    });
    
    // Тесты для работы с куками
    
    test('should correctly prioritize utm parameters over referrers', () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?utm_source=newsletter&utm_medium=email&utm_campaign=winter_promo',
                hostname: 'example.com'
            },
            writable: true
        });
        
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.google.com/search?q=test+query',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('newsletter');
        expect(params.utm_medium).toBe('email');
        expect(params.utm_campaign).toBe('winter_promo');
    });
    
    test('should correctly save initial visit even after multiple subsequent visits', () => {
        // Первое посещение - с Google
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.google.com/search?q=test+query',
            writable: true
        });
        
        utmHandler.saveUtmAndReferrerToCookies();
        
        // Второе посещение - с Facebook
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.facebook.com/somepage',
            writable: true
        });
        
        utmHandler.saveUtmAndReferrerToCookies();
        
        // Третье посещение - прямой заход
        Object.defineProperty(document, 'referrer', {
            value: '',
            writable: true
        });
        
        utmHandler.saveUtmAndReferrerToCookies();
        
        const cookieData = JSON.parse(utmHandler.getCookie('utm_data'));
        
        // Первое посещение должно оставаться от Google
        expect(cookieData.first_visit.utm.utm_source).toBe('google');
        expect(cookieData.first_visit.utm.utm_medium).toBe('organic');
        
        // Последнее сохраненное посещение должно быть от Facebook
        expect(cookieData.second_visit.utm.utm_source).toBe('facebook');
        expect(cookieData.second_visit.utm.utm_medium).toBe('social');
    });
    
    test('should correctly handle clearHost function for different URL formats', () => {
        expect(utmHandler.clearHost('http://example.com')).toBe('example.com');
        expect(utmHandler.clearHost('https://example.com')).toBe('example.com');
        expect(utmHandler.clearHost('www.example.com')).toBe('example.com');
        expect(utmHandler.clearHost('http://www.example.com')).toBe('example.com');
        expect(utmHandler.clearHost('https://www.example.com')).toBe('example.com');
    });
    
    test('should correctly identify and save mixed traffic sources across visits', () => {
        // Начальный визит через органику
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.google.com/search?q=test+query',
            writable: true
        });
        
        utmHandler.saveUtmAndReferrerToCookies();
        
        // Следующий визит через оплаченную рекламу
        Object.defineProperty(window, 'location', {
            value: {
                search: '?utm_source=adwords&utm_medium=cpc&utm_campaign=brand_campaign',
                hostname: 'example.com'
            },
            writable: true
        });
        
        Object.defineProperty(document, 'referrer', {
            value: '',
            writable: true
        });
        
        utmHandler.saveUtmAndReferrerToCookies();
        
        const cookieData = JSON.parse(utmHandler.getCookie('utm_data'));
        
        expect(cookieData.first_visit.utm.utm_source).toBe('google');
        expect(cookieData.first_visit.utm.utm_medium).toBe('organic');
        
        expect(cookieData.second_visit.utm.utm_source).toBe('adwords');
        expect(cookieData.second_visit.utm.utm_medium).toBe('cpc');
        expect(cookieData.second_visit.utm.utm_campaign).toBe('brand_campaign');
    });

    // Дополнительные тесты для улучшения покрытия

    test('should handle nested subdomains correctly', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'https://news.blog.google.com/article',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('google');
        expect(params.utm_medium).toBe('organic');
    });
    
    test('should handle invalid or malformed URLs gracefully', () => {
        Object.defineProperty(document, 'referrer', {
            value: 'invalid-url',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('direct'); // Должен вернуть прямой трафик при ошибке парсинга
    });
    
    test('should handle empty referrer correctly', () => {
        Object.defineProperty(document, 'referrer', {
            value: '',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('direct');
        expect(params.utm_medium).toBe('(not set)');
    });
    
    test('should correctly identify traffic from the same domain as direct', () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                hostname: 'mysite.com'
            },
            writable: true
        });
        
        Object.defineProperty(document, 'referrer', {
            value: 'https://mysite.com/some-page',
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_source).toBe('direct'); // Внутренний трафик считается прямым
    });
    
    test('should handle absent utm_data cookie gracefully', () => {
        // Убедимся, что куки нет
        document.cookie = "utm_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        const result = utmHandler.getUtmAndReferrerFromCookies();
        expect(result).toEqual({});
    });
    
    test('should handle malformed cookie data gracefully', () => {
        // Установим некорректную куку
        document.cookie = "utm_data=invalid-json; path=/;";
        
        const result = utmHandler.getUtmAndReferrerFromCookies();
        expect(result).toEqual({});
    });

    test('should correctly migrate data from second_visit to first_visit if needed', () => {
        // Сначала удаляем любые существующие куки
        document.cookie = "utm_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        // Устанавливаем куку только со вторым визитом
        const cookieData = {
            second_visit: {
                utm: {
                    utm_source: 'facebook',
                    utm_medium: 'social',
                    utm_campaign: 'promo',
                    utm_term: 'term',
                    utm_content: 'content'
                },
                referrer: 'https://www.facebook.com/'
            }
        };
        
        utmHandler.setCookie('utm_data', JSON.stringify(cookieData), 1);
        const result = utmHandler.getUtmAndReferrerFromCookies();
        
        // first_visit должен быть заполнен из second_visit
        expect(result.first_visit).toEqual(cookieData.second_visit);
    });
    
    test('should update second_visit for direct traffic with external referrer', () => {
        // Сначала удаляем любые существующие куки
        document.cookie = "utm_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        // Первый визит
        utmHandler.setCookie('utm_data', JSON.stringify({
            first_visit: {
                utm: {
                    utm_source: 'google',
                    utm_medium: 'organic',
                    utm_campaign: '(not set)',
                    utm_term: '(not set)',
                    utm_content: '(not set)'
                },
                referrer: 'https://www.google.com/'
            }
        }), 30);
        
        // Следующий визит - прямой, но с внешним реферером
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                hostname: 'example.com'
            },
            writable: true
        });
        
        Object.defineProperty(document, 'referrer', {
            value: 'https://www.reddit.com/r/javascript',
            writable: true
        });
        
        utmHandler.saveUtmAndReferrerToCookies();
        
        const cookieData = JSON.parse(utmHandler.getCookie('utm_data'));
        expect(cookieData.second_visit.utm.utm_source).toBe('reddit.com');
        expect(cookieData.second_visit.utm.utm_medium).toBe('referral');
    });
    
    test('should not update second_visit for direct traffic without referrer', () => {
        // Сначала удаляем любые существующие куки
        document.cookie = "utm_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        // Первый визит
        const initialData = {
            first_visit: {
                utm: {
                    utm_source: 'google',
                    utm_medium: 'organic',
                    utm_campaign: '(not set)',
                    utm_term: '(not set)',
                    utm_content: '(not set)'
                },
                referrer: 'https://www.google.com/'
            },
            second_visit: {
                utm: {
                    utm_source: 'facebook',
                    utm_medium: 'social',
                    utm_campaign: '(not set)',
                    utm_term: '(not set)',
                    utm_content: '(not set)'
                },
                referrer: 'https://www.facebook.com/'
            }
        };
        
        utmHandler.setCookie('utm_data', JSON.stringify(initialData), 30);
        
        // Следующий визит - прямой, без реферера
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                hostname: 'example.com'
            },
            writable: true
        });
        
        Object.defineProperty(document, 'referrer', {
            value: '',
            writable: true
        });
        
        utmHandler.saveUtmAndReferrerToCookies();
        
        const cookieData = JSON.parse(utmHandler.getCookie('utm_data'));
        // Second visit должен остаться прежним
        expect(cookieData.second_visit).toEqual(initialData.second_visit);
    });
    
    test('should handle shouldUpdateSecondVisit function correctly', () => {
        // Проверка функции напрямую для разных сценариев
        
        // 1. Источник не "direct" - должно вернуть true
        expect(utmHandler.shouldUpdateSecondVisit(
            { utm_source: 'google', utm_medium: 'organic' },
            'https://www.google.com',
            'example.com'
        )).toBe(true);
        
        // 2. Источник "direct", но есть внешний реферер - должно вернуть true
        expect(utmHandler.shouldUpdateSecondVisit(
            { utm_source: 'direct', utm_medium: '(not set)' },
            'https://www.facebook.com',
            'example.com'
        )).toBe(true);
        
        // 3. Источник "direct" и нет внешнего реферера - должно вернуть false
        expect(utmHandler.shouldUpdateSecondVisit(
            { utm_source: 'direct', utm_medium: '(not set)' },
            '',
            'example.com'
        )).toBe(false);
        
        // 4. Источник "direct" и реферер с того же домена - должно вернуть false
        expect(utmHandler.shouldUpdateSecondVisit(
            { utm_source: 'direct', utm_medium: '(not set)' },
            'https://example.com/page',
            'example.com'
        )).toBe(false);
    });
    
    test('should correctly preserve utm_campaign, utm_term and utm_content', () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '?utm_source=newsletter&utm_medium=email&utm_campaign=spring_sale&utm_term=discount&utm_content=banner',
                hostname: 'example.com'
            },
            writable: true
        });
        
        const params = utmHandler.getUrlParams();
        expect(params.utm_campaign).toBe('spring_sale');
        expect(params.utm_term).toBe('discount');
        expect(params.utm_content).toBe('banner');
        
        utmHandler.saveUtmAndReferrerToCookies();
        const cookieData = JSON.parse(utmHandler.getCookie('utm_data'));
        
        // Проверяем, что все параметры сохранены в куки
        expect(cookieData.first_visit.utm.utm_campaign).toBe('spring_sale');
        expect(cookieData.first_visit.utm.utm_term).toBe('discount');
        expect(cookieData.first_visit.utm.utm_content).toBe('banner');
    });
});