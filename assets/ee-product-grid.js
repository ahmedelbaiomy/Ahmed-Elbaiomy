(function () {
  var grid = document.querySelector('.ee-grid');
  if (!grid) return;

  var modal = grid.querySelector('.ee-grid__modal');
  if (!modal) return;

  var moneyFormat = grid.getAttribute('data-money-format') || '${{amount}}';
  var chevronUrl = grid.getAttribute('data-chevron-url') || '';
  var dialog = modal.querySelector('.ee-grid__modal-dialog');
  var imageEl = modal.querySelector('.ee-grid__modal-image');
  var titleEl = modal.querySelector('.ee-grid__modal-title');
  var priceEl = modal.querySelector('.ee-grid__modal-price');
  var descriptionEl = modal.querySelector('.ee-grid__modal-description');
  var optionsEl = modal.querySelector('.ee-grid__modal-options');
  var addButton = modal.querySelector('.ee-grid__modal-add');
  var addButtonText = addButton.querySelector('span');

  var currentProduct = null;
  var currentVariant = null;
  var selectedOptions = [];
  var isSubmitting = false;

  var bonusProduct = null;
  var bonusScript = document.getElementById('ee-grid-bonus-product');
  if (bonusScript) {
    try {
      bonusProduct = JSON.parse(bonusScript.textContent);
    } catch (error) {
      bonusProduct = null;
    }
  }

  function formatMoney(cents, format) {
    var placeholderMatch = format.match(/\{\{\s*(\w+)\s*\}\}/);
    var key = placeholderMatch ? placeholderMatch[1] : 'amount';
    var precision = key.indexOf('no_decimals') === -1 ? 2 : 0;
    var thousands = key.indexOf('comma_separator') === -1 ? ',' : '.';
    var decimal = key.indexOf('comma_separator') === -1 ? '.' : ',';
    var parts = (cents / 100).toFixed(precision).split('.');

    parts[0] = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + thousands);

    var value = parts[1] ? parts[0] + decimal + parts[1] : parts[0];

    return placeholderMatch ? format.replace(placeholderMatch[0], value) : format + value;
  }

  function findVariant() {
    if (!currentProduct || !currentProduct.variants) return null;

    for (var i = 0; i < currentProduct.variants.length; i++) {
      var variant = currentProduct.variants[i];
      var matches = true;

      for (var j = 0; j < selectedOptions.length; j++) {
        if (!selectedOptions[j] || variant.options[j] !== selectedOptions[j]) {
          matches = false;
          break;
        }
      }

      if (matches) return variant;
    }

    return null;
  }

  function findOptionIndex(product, name) {
    if (!product || !product.options) return -1;

    for (var i = 0; i < product.options.length; i++) {
      if (product.options[i] && product.options[i].toLowerCase() === name) return i;
    }

    return -1;
  }

  function findFirstAvailableVariant(product) {
    if (!product || !product.variants) return null;

    for (var i = 0; i < product.variants.length; i++) {
      if (product.variants[i].available) return product.variants[i];
    }

    return null;
  }

  function variantTriggersBonusRule(product, variant) {
    if (!product || !variant || !variant.options) return false;

    var colorIndex = findOptionIndex(product, 'color');
    var sizeIndex = findOptionIndex(product, 'size');

    if (colorIndex === -1 || sizeIndex === -1) return false;

    var colorValue = variant.options[colorIndex];
    var sizeValue = variant.options[sizeIndex];

    return (
      !!colorValue &&
      !!sizeValue &&
      colorValue.toLowerCase() === 'black' &&
      sizeValue.toLowerCase() === 'medium'
    );
  }

  function getBonusVariant() {
    if (!bonusProduct || !bonusProduct.variants) return null;

    var colorIndex = findOptionIndex(bonusProduct, 'color');
    var sizeIndex = findOptionIndex(bonusProduct, 'size');

    if (colorIndex !== -1 && sizeIndex !== -1) {
      for (var i = 0; i < bonusProduct.variants.length; i++) {
        var variant = bonusProduct.variants[i];
        var colorValue = variant.options[colorIndex];
        var sizeValue = variant.options[sizeIndex];

        if (
          colorValue &&
          sizeValue &&
          colorValue.toLowerCase() === 'black' &&
          sizeValue.toLowerCase() === 'medium' &&
          variant.available
        ) {
          return variant;
        }
      }
    }

    return findFirstAvailableVariant(bonusProduct);
  }

  function updateVariantState() {
    currentVariant = findVariant();

    if (currentVariant) {
      priceEl.textContent = formatMoney(currentVariant.price, moneyFormat);

      if (currentVariant.featured_image && currentVariant.featured_image.src) {
        imageEl.src = currentVariant.featured_image.src;
      }
    }

    var available = !!(currentVariant && currentVariant.available);
    addButton.disabled = !available;
    addButtonText.textContent = !currentVariant ? 'Select options' : available ? 'Add to cart' : 'Sold out';
  }

  function buildOptions() {
    optionsEl.innerHTML = '';
    selectedOptions = [];

    var hasRealOptions =
      currentProduct.options &&
      currentProduct.variants &&
      currentProduct.options.length > 0 &&
      !(currentProduct.variants.length === 1 && currentProduct.options[0] === 'Title');

    if (!hasRealOptions) return;

    var optionBlocks = [];

    currentProduct.options.forEach(function (name, index) {
      var values = [];

      currentProduct.variants.forEach(function (variant) {
        var value = variant.options && variant.options[index];
        if (value && values.indexOf(value) === -1) values.push(value);
      });

      var isColor = name.toLowerCase() === 'color';

      selectedOptions[index] = '';

      var wrap = document.createElement('div');
      wrap.className = 'ee-grid__modal-option';

      var label = document.createElement('span');
      label.className = 'ee-grid__modal-option-label';
      label.textContent = name;
      wrap.appendChild(label);

      if (isColor) {
        var swatches = document.createElement('div');
        swatches.className = 'ee-grid__modal-swatches';

        values.forEach(function (value) {
          var swatch = document.createElement('button');
          swatch.type = 'button';
          swatch.className = 'ee-grid__swatch';
          swatch.textContent = value;
          swatch.style.setProperty('--swatch-color', value.toLowerCase());
          swatch.setAttribute('aria-pressed', value === selectedOptions[index] ? 'true' : 'false');

          swatch.addEventListener('click', function () {
            selectedOptions[index] = value;

            var buttons = swatches.querySelectorAll('.ee-grid__swatch');
            for (var i = 0; i < buttons.length; i++) {
              buttons[i].setAttribute('aria-pressed', buttons[i] === swatch ? 'true' : 'false');
            }

            updateVariantState();
          });

          swatches.appendChild(swatch);
        });

        wrap.appendChild(swatches);
      } else {
        var selectWrap = document.createElement('div');
        selectWrap.className = 'ee-grid__modal-select-wrap';

        var select = document.createElement('select');
        select.className = 'ee-grid__modal-select';

        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose your ' + name.toLowerCase();
        select.appendChild(placeholder);

        values.forEach(function (value) {
          var option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        });

        select.value = '';

        select.addEventListener('mousedown', function () {
          selectWrap.setAttribute('data-open', 'true');
        });

        select.addEventListener('blur', function () {
          selectWrap.setAttribute('data-open', 'false');
        });

        select.addEventListener('change', function () {
          selectedOptions[index] = select.value;
          selectWrap.setAttribute('data-open', 'false');
          updateVariantState();
        });

        var chevron = document.createElement('span');
        chevron.className = 'ee-grid__modal-select-chevron';
        chevron.setAttribute('aria-hidden', 'true');

        var chevronImg = document.createElement('img');
        chevronImg.src = chevronUrl;
        chevronImg.alt = '';
        chevron.appendChild(chevronImg);

        selectWrap.appendChild(select);
        selectWrap.appendChild(chevron);
        wrap.appendChild(selectWrap);
      }

      optionBlocks.push({ isColor: isColor, element: wrap });
    });

    optionBlocks.sort(function (a, b) {
      return (b.isColor ? 1 : 0) - (a.isColor ? 1 : 0);
    });

    optionBlocks.forEach(function (block) {
      optionsEl.appendChild(block.element);
    });
  }

  function openModal(product) {
    if (!product || typeof product !== 'object' || !product.title || !product.variants) {
      console.warn('ee-grid: incomplete product data received, ignoring click', product);
      return;
    }

    currentProduct = product;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    dialog.focus();

    imageEl.src = product.featured_image || (product.images && product.images[0]) || '';
    imageEl.alt = product.title || '';
    titleEl.textContent = product.title || '';
    descriptionEl.innerHTML = product.description || '';

    buildOptions();
    updateVariantState();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    currentProduct = null;
    currentVariant = null;
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-ee-grid-trigger]');

    if (trigger) {
      var script = document.getElementById('ee-grid-product-' + trigger.getAttribute('data-block-id'));
      if (script) openModal(JSON.parse(script.textContent));
      return;
    }

    if (event.target.closest('[data-ee-grid-close]')) closeModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  addButton.addEventListener('click', function () {
    if (isSubmitting || !currentVariant || !currentVariant.available) return;

    isSubmitting = true;
    addButton.disabled = true;
    addButtonText.textContent = 'Adding...';

    var items = [{ id: currentVariant.id, quantity: 1 }];

    if (variantTriggersBonusRule(currentProduct, currentVariant)) {
      var bonusVariant = getBonusVariant();

      if (bonusVariant && bonusVariant.id !== currentVariant.id) {
        items.push({ id: bonusVariant.id, quantity: 1 });
      } else if (!bonusVariant) {
        console.warn('ee-grid: Black + Medium rule triggered but no available bonus product variant was found');
      }
    }

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items })
    })
      .then(function (response) {
        if (!response.ok) throw new Error('add-to-cart-failed');
        return response.json();
      })
      .then(function () {
        addButtonText.textContent = 'Added';
        setTimeout(function () {
          isSubmitting = false;
          addButton.disabled = false;
          updateVariantState();
        }, 1500);
      })
      .catch(function () {
        isSubmitting = false;
        addButtonText.textContent = 'Try again';
        addButton.disabled = false;
      });
  });
})();
