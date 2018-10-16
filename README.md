# cart-nodejs-mongo-sync-calculate
A single NodeJS function to handle sync call for add/edit/remove items in user cart

## Usage
```js
  const cartCalc = require('cart-calc.js');
  var output = cartCalc.calculateCartAmount(newItem, previous, isUpdate, isRemove);
```

## Parametes

| parameter | Explanation |
| --- | --- |
| newItem | New item to add to the cart. ``` null ``` for a remove request. |
| previous | Cart item already in current cart. Empty for a new cart instance. |
| isUpdate | True for a cart update request. |
| isRemove | True for remove an item from the cart. |

## Returns

| Return attribute | Explanation |
| --- | --- |
| output.amount | Object contains gross amount, taxs, gross discount and net amount after add/edit/remove of cart item. |
| output.pUI | Is the 'previous Updatable Item' which will contain item already present in cart similar to new item. ``` null ``` if no such item is present in current cart or this is an output of an item remove request. |

### Note
  Also add any new cart related calculations in this file.
