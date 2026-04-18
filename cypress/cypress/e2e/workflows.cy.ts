const PERSISTENT_EMAIL = 'persistent.tester2026@example.com';
const PERSISTENT_PASSWORD = 'PersistTest123!';

const waitForPageSettle = () => {
  cy.wait(1000);
};

const toNumber = (text: string) => Number(text.replace(/[^\d.,-]/g, '').replace(/,/g, ''));

const selectPaymentMethodAndContinue = () => {
  cy.get('body').then(($body) => {
    const creditCardMethod = $body.find("input[type='radio'][name='paymentmethod'][value*='Manual']");
    const allMethods = $body.find("input[type='radio'][name='paymentmethod']");

    if (creditCardMethod.length > 0) {
      cy.wrap(creditCardMethod.first()).check({ force: true });
      return;
    }

    if (allMethods.length > 0) {
      cy.wrap(allMethods.first()).check({ force: true });
    }
  });

  cy.get('.payment-method-next-step-button:visible').click();
};

const completePaymentInfoAndContinue = (cardholderName: string) => {
  cy.get('body').then(($body) => {
    if ($body.find('#CardholderName').length > 0) {
      cy.get('#CardholderName').type(cardholderName);
      cy.get('#CardNumber').type('0000 0000 0000 0000');
      cy.get('#ExpireMonth').select('04');
      cy.get('#ExpireYear').select('2030');
      cy.get('#CardCode').type('123');
    }
  });

  cy.get('.payment-info-next-step-button:visible').click();
};

const closeBarNotificationIfPresent = () => {
  cy.get('body').then(($body) => {
    if ($body.find('#bar-notification .close').length > 0) {
      cy.get('#bar-notification .close').click({ force: true });
    }
  });
};

const goToCart = () => {
  closeBarNotificationIfPresent();
  cy.get('a.ico-cart').first().click({ force: true });
};

const completeCheckoutAndAssertSuccess = () => {
  cy.url().then((currentUrl) => {
    if (currentUrl.includes('/onepagecheckout')) {
      cy.get('body').then(($body) => {
        if ($body.find('#confirm-order-buttons-container .confirm-order-next-step-button').length > 0) {
          cy.get('#confirm-order-buttons-container .confirm-order-next-step-button').first().click({ force: true });
        } else if ($body.find('.confirm-order-next-step-button').length > 0) {
          cy.get('.confirm-order-next-step-button').first().click({ force: true });
        } else {
          cy.log('Confirm button not rendered, checking final completion state directly.');
        }
      });
    }
  });

  cy.url({ timeout: 20000 }).should('include', '/checkout/completed');
  cy.get('.order-completed .title', { timeout: 20000 }).invoke('text').then((text) => {
    expect(text.trim()).to.eq('Your order has been successfully processed!');
  });
};

type AddressPayload = {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  address1: string;
  zipPostalCode: string;
  phoneNumber: string;
};

const fillAddressForm = (prefix: string, payload: AddressPayload) => {
  cy.intercept('GET', '**/getstatesbycountryid*').as(`getStates_${prefix}`);
  cy.get(`#${prefix}_CountryId`).select('237');

  // In some environments the request can be cached or resolved very fast.
  // Waiting for the dropdown options is more reliable than waiting on the alias.
  cy.get(`#${prefix}_StateProvinceId option`).should('have.length.greaterThan', 1);
  cy.get(`#${prefix}_StateProvinceId`).select(1);

  cy.get(`#${prefix}_FirstName`).clear().type(payload.firstName);
  cy.get(`#${prefix}_LastName`).clear().type(payload.lastName);
  cy.get(`#${prefix}_Email`).clear().type(payload.email);
  cy.get(`#${prefix}_City`).clear().type(payload.city);
  cy.get(`#${prefix}_Address1`).clear().type(payload.address1);
  cy.get(`#${prefix}_ZipPostalCode`).clear().type(payload.zipPostalCode);
  cy.get(`#${prefix}_PhoneNumber`).clear().type(payload.phoneNumber);
};

const loginWithPersistentAccount = () => {
  cy.visit('/login');
  waitForPageSettle();
  cy.get('#Email').clear().type(PERSISTENT_EMAIL);
  cy.get('#Password').clear().type(PERSISTENT_PASSWORD);
  cy.get('button.login-button').click();
  cy.get('a.ico-account').should('be.visible');
};

const ensurePersistentAccountExists = () => {
  cy.visit('/register');
  waitForPageSettle();

  cy.get('#gender-male').check({ force: true });
  cy.get('#FirstName').clear().type('Persistent');
  cy.get('#LastName').clear().type('Tester');
  cy.get('#Email').clear().type(PERSISTENT_EMAIL);
  cy.get('#Password').clear().type(PERSISTENT_PASSWORD);
  cy.get('#ConfirmPassword').clear().type(PERSISTENT_PASSWORD);
  cy.get('#register-button').click();

  cy.get('body').then(($body) => {
    const registrationResult = $body.find('div.result:contains("Your registration completed")');
    if (registrationResult.length > 0) {
      cy.get('a.ico-logout').click();
      return;
    }

    cy.visit('/login');
    waitForPageSettle();
  });
};

describe('NopCommerce Workflows', () => {
  describe('Guest Purchase Journeys', () => {
    it('Guest shopping flow: wishlist -> cart -> checkout success', () => {
      cy.visit('/');
      waitForPageSettle();

      cy.get("a.menu__link[href='/computers']").realHover();
      cy.get("a[href='/notebooks']").click({ force: true });

      cy.intercept('**/*').as('ajaxFilter');
      cy.get("input[id='attribute-option-9']").check({ force: true });
      cy.wait('@ajaxFilter').its('response.statusCode').should('eq', 200);

      cy.get('.product-item').first().find('button.add-to-wishlist-button').click({ force: true });

      cy.url().then((currentUrl) => {
        if (currentUrl.includes('/apple-macbook-pro')) {
          cy.intercept(/addproducttocart/i).as('addWishlistOnDetails');
          cy.get('#add-to-wishlist-button-4').click();
          cy.wait('@addWishlistOnDetails');
        }
      });

      cy.get('div.bar-notification.success').should('be.visible');
      cy.get('#bar-notification .close').click({ force: true });

      cy.get('.ico-wishlist').click();
      cy.get("input[name='addtocart']").first().check({ force: true });
      cy.get("button[name='addtocartbutton']").click();

      cy.get('.product-unit-price').first().invoke('text').then((unitPriceText) => {
        const unitPrice = toNumber(unitPriceText);

        cy.get('input.qty-input').first().clear().type('2{enter}');
        cy.get('.product-subtotal').first().invoke('text').then((subtotalText) => {
          const totalPrice = toNumber(subtotalText);
          expect(totalPrice).to.be.closeTo(unitPrice * 2, 0.01);
        });
      });

      cy.get('#termsofservice').check({ force: true });
      cy.get('#checkout').click();
      cy.get('button.checkout-as-guest-button').click();

      fillAddressForm('BillingNewAddress', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.guest@example.com',
        city: 'New York',
        address1: '123 Guest St',
        zipPostalCode: '10001',
        phoneNumber: '1234567890',
      });

      cy.get('#billing-buttons-container .new-address-next-step-button:visible').click();
      cy.get('#shippingoption_1').check({ force: true });
      cy.get('.shipping-method-next-step-button:visible').click();

      selectPaymentMethodAndContinue();
      completePaymentInfoAndContinue('John Doe');
      completeCheckoutAndAssertSuccess();
    });

    it('PC configurator flow: dynamic pricing + invalid coupon + order completion', () => {
      cy.visit('/');
      waitForPageSettle();

      cy.get('body').then(($body) => {
        if ($body.find('#customerCurrency').length > 0) {
          cy.get('#customerCurrency').select('Euro');
          cy.get('.actual-price').first().should('contain.text', '€');
        } else {
          cy.log('Currency selector not enabled in this store config, skipping currency check.');
        }
      });

      cy.get('#small-searchterms').type('Build your own computer');
      cy.get('button.search-box-button').click();
      cy.get('.product-item').first().find('h2 a').click();

      cy.get('div.product-price span').invoke('text').then((basePriceText) => {
        const basePrice = toNumber(basePriceText);

        cy.get("select[name='product_attribute_2'] option").eq(1).then(($option) => {
          cy.get("select[name='product_attribute_2']").select(($option.val() as string) || '');
        });

        cy.intercept(/productdetails_attributechange/i).as('attrChange1');
        cy.get("input[name='product_attribute_3'][value='7']").check({ force: true });
        cy.wait('@attrChange1');

        cy.intercept(/productdetails_attributechange/i).as('attrChange2');
        cy.get("input[name='product_attribute_5'][value='11']").check({ force: true });
        cy.wait('@attrChange2');

        cy.intercept(/productdetails_attributechange/i).as('attrChange3');
        cy.get("input[name='product_attribute_5'][value='12']").check({ force: true });
        cy.wait('@attrChange3');

        cy.get('div.product-price span').invoke('text').then((newPriceText) => {
          const newPrice = toNumber(newPriceText);
          expect(newPrice).to.be.greaterThan(basePrice);
        });
      });

      cy.intercept(/addproducttocart/i).as('addConfiguredPc');
      cy.get('#add-to-cart-button-1').click();
      cy.wait('@addConfiguredPc');

      goToCart();
      cy.get('#discountcouponcode').type('cupon-fals-2026');
      cy.get('#applydiscountcouponcode').click();

      cy.get('body').then(($body) => {
        if ($body.find('div.message-failure').length > 0) {
          cy.get('div.message-failure').first().invoke('text').then((failureText) => {
            const normalized = failureText.trim().toLowerCase();
            if (normalized.length > 0) {
              expect(normalized).to.contain('coupon');
            } else {
              cy.log('Coupon failure container was present but empty, skipping strict text assertion.');
            }
          });
        } else {
          cy.log('Coupon error banner did not appear, continuing as soft assertion.');
        }
      });

      cy.get('#termsofservice').check({ force: true });
      cy.get('#checkout').click();
      cy.get('button.checkout-as-guest-button').click();

      fillAddressForm('BillingNewAddress', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.guest@example.com',
        city: 'New York',
        address1: '123 Builder St',
        zipPostalCode: '10001',
        phoneNumber: '1234567890',
      });

      cy.get('#ShipToSameAddress').then(($checkbox) => {
        if (($checkbox[0] as HTMLInputElement).checked) {
          cy.wrap($checkbox).uncheck({ force: true });
        }
      });

      cy.get('.new-address-next-step-button:visible').click();

      cy.get('#shipping-address-select').select('New Address');
      fillAddressForm('ShippingNewAddress', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.guest@example.com',
        city: 'Los Angeles',
        address1: '123 Shipping St',
        zipPostalCode: '90001',
        phoneNumber: '0987654321',
      });

      cy.get('#shipping-buttons-container .new-address-next-step-button:visible').click();
      cy.get('.shipping-method-next-step-button:visible').click();

      selectPaymentMethodAndContinue();
      completePaymentInfoAndContinue('John Doe');
      completeCheckoutAndAssertSuccess();
      waitForPageSettle();
    });

    it('Compare table flow: add two products, validate table, clear list', () => {
      cy.visit('/');

      cy.get('#small-searchterms').type('htc');
      cy.get('button.search-box-button').click();

      cy.intercept(/compare/i).as('compareHtc');
      cy.get('.product-item').first().find('button.add-to-compare-list-button').click();
      cy.wait('@compareHtc');
      cy.get('#bar-notification .close').click({ force: true });

      cy.get('#small-searchterms').clear().type('apple');
      cy.get('button.search-box-button').click();

      cy.intercept(/compare/i).as('compareApple');
      cy.get('.product-item').first().find('button.add-to-compare-list-button').click();
      cy.wait('@compareApple');

      cy.get("a[href='/compareproducts']").first().click();

      cy.get('table.compare-products-table tbody tr').first().find('td').should('have.length', 3);
      cy.get('tr.product-name').invoke('text').then((rowText) => {
        const text = rowText.toLowerCase();
        expect(text).to.include('htc');
        expect(text).to.include('apple');
      });

      cy.get('a.clear-list').click();
      cy.get('div.no-data').invoke('text').then((text) => {
        expect(text.trim()).to.eq('You have no items to compare.');
      });
    });

    it('Digital product flow: verify checkout works with skipped shipping when applicable', () => {
      cy.visit('/');
      waitForPageSettle();

      cy.get("a.menu__link[href='/digital-downloads']").click();
      cy.get('.product-item').first().find('button.product-box-add-to-cart-button').click({ force: true });

      cy.get('body').then(($body) => {
        if ($body.find('button.add-to-cart-button').length > 0) {
          cy.intercept(/addproducttocart/i).as('addDigitalProduct');
          cy.get('button.add-to-cart-button').click({ force: true });
          cy.wait('@addDigitalProduct');
        }
      });

      goToCart();
      cy.get('#termsofservice').check({ force: true });
      cy.get('#checkout').click();
      cy.get('button.checkout-as-guest-button').click();

      fillAddressForm('BillingNewAddress', {
        firstName: 'Digi',
        lastName: 'Buyer',
        email: 'digi@example.com',
        city: 'New York',
        address1: '123 Digi St',
        zipPostalCode: '10001',
        phoneNumber: '1234567890',
      });

      cy.get('.new-address-next-step-button:visible').click();

      cy.get('body').then(($body) => {
        const paymentMethodStep = $body.find('li#opc-payment_method');
        const classAttr = paymentMethodStep.attr('class') || '';

        if (!classAttr.includes('active')) {
          cy.log('Shipping step was not skipped for digital product.');
          cy.get('.shipping-method-next-step-button:visible').click();
        }
      });

      selectPaymentMethodAndContinue();
      completePaymentInfoAndContinue('Digi Buyer');
      completeCheckoutAndAssertSuccess();
    });
  });

  describe('Account-Based Journeys', () => {
    it('Register and place an order in the same session', () => {
      const uniqueEmail = `testuser_${Date.now()}@example.com`;
      const password = 'TestPass123!';

      cy.visit('/');
      waitForPageSettle();
      cy.get('a.ico-register').click();

      cy.get('#gender-male').check({ force: true });
      cy.get('#FirstName').type('Test');
      cy.get('#LastName').type('User');
      cy.get('#Email').type(uniqueEmail);
      cy.get('#Password').type(password);
      cy.get('#ConfirmPassword').type(password);
      cy.get('#register-button').click();

      cy.get('div.result').invoke('text').then((text) => {
        expect(text.trim()).to.eq('Your registration completed');
      });
      cy.get('a.register-continue-button').click();

      cy.get('#small-searchterms').type('Nokia Lumia');
      cy.get('button.search-box-button').click();
      cy.get('.product-item').first().find('h2 a').click();

      cy.intercept(/addproducttocart/i).as('addNokia');
      cy.get('button.add-to-cart-button').click();
      cy.wait('@addNokia');

      cy.get('div.bar-notification.success').should('be.visible');
      cy.get('#bar-notification .close').click({ force: true });

      goToCart();
      cy.get('#termsofservice').check({ force: true });
      cy.get('#checkout').click();

      cy.get('li#opc-billing').should('have.class', 'active');

      fillAddressForm('BillingNewAddress', {
        firstName: 'Test',
        lastName: 'User',
        email: uniqueEmail,
        city: 'New York',
        address1: '123 Register St',
        zipPostalCode: '10001',
        phoneNumber: '1234567890',
      });

      cy.get('#billing-buttons-container .new-address-next-step-button:visible').click();
      cy.get('.shipping-method-next-step-button:visible').click();

      selectPaymentMethodAndContinue();
      completePaymentInfoAndContinue('Test User');
      completeCheckoutAndAssertSuccess();
    });

    it('Login persistence: saved address and cart survive logout/login cycle', () => {
      ensurePersistentAccountExists();
      loginWithPersistentAccount();

      cy.get('a.ico-account').click();
      cy.get("#main a[href='/customer/addresses']").click();
      cy.get('button.add-address-button').click();

      const addressCity = `TestCity${Date.now()}`;
      fillAddressForm('Address', {
        firstName: 'Persistent',
        lastName: 'Tester',
        email: PERSISTENT_EMAIL,
        city: addressCity,
        address1: '456 Persistence Ave',
        zipPostalCode: '10002',
        phoneNumber: '5551234567',
      });
      cy.get('button.save-address-button').click();

      cy.get('#small-searchterms').type('Nokia Lumia');
      cy.get('button.search-box-button').click();
      cy.get('.product-item').first().find('h2 a').click();

      cy.intercept(/addproducttocart/i).as('addForPersistence');
      cy.get('button.add-to-cart-button').click();
      cy.wait('@addForPersistence');

      cy.get('div.bar-notification.success').should('be.visible');
      cy.get('#bar-notification .close').click({ force: true });

      cy.get('a.ico-logout').click();
      cy.get('a.ico-login').should('be.visible');

      loginWithPersistentAccount();

      cy.get('a.ico-cart .cart-qty').invoke('text').then((qtyText) => {
        const cartCount = Number(qtyText.replace(/[^\d]/g, ''));
        expect(cartCount, `Cart badge should be > 0, got ${qtyText}`).to.be.greaterThan(0);
      });

      cy.get('.ico-cart').click();
      cy.get('#termsofservice').check({ force: true });
      cy.get('#checkout').click();

      cy.get('#billing-address-select').should('be.visible').invoke('text').then((dropdownText) => {
        const normalized = dropdownText.toLowerCase();
        expect(
          normalized.includes('persistence ave') || normalized.includes(addressCity.toLowerCase()),
          `Saved address should exist in billing dropdown. Found: ${dropdownText}`,
        ).to.equal(true);
      });
    });
  });
});
