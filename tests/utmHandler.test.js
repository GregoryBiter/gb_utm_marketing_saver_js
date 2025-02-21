const utmHandler = require('../src/utm.js');

describe('utmHandler', () => {
    beforeEach(() => {
        // Очистка куки перед каждым тестом
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
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
});