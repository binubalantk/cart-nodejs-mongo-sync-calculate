# cart-nodejs-mongo-sync-calculate
A single NodeJS function to handle sync call for add/edit/remove items in user cart

## Usage
```js
  const cartCalc = require('cart-calc.js');
  cartCalc.calculateCartAmount(newItem, previous, isUpdate, isRemove);
```

## Parametes

| parameter | Explanation |
| --- | --- |
| newItem | New item to add to the cart. null for a remove request |
| previous | Cart item already in current cart. Empty for a new cart instance |
| isUpdate | True for a cart update request |
| isRemove | True for remove an item from the cart |

### Note
  Also add any new cart related calculations in this file.
