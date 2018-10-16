//import
var ServerResponse = require('./serverResponse');
var config = require('../config');
var User = require('../models/user');
var Cart = require('../models/cart');
var mongoose = require("mongoose");
var Product = require('../models/product');

//start module export
module.exports = {
    //... other cart calcs

    /*
        function to calculate cart amount
            params:
                newItem -> new item to be added to cart
                previous -> previous cart items
                isUpdate$ -> show that it is an update cart request (optional)
                isRemove$ -> show that it is a remove a cart item request (optional)
            return:
                amount cache with gross amount, different taxe totals, gross discounts and net amount
                PUI-(previous Updatable Item) to save back to database if item already present in cart
     */
    calculateCartAmount(newItem, previous, isUpdate$, isRemove$) //
    {
        //setup the output to be returned
        var amount = {
            grossAmount: 0,
            tax: [],
            grossDiscount:0,
            netAmount: 0
        };

        // isAlready -> flag set when new item is already present in cart, to prevent it to be added again
        var isAlrdy = false;

        // (previous Updatable Item) item already present in cart which is found to be same as new item
        //this will return to save back to database
        var pUI = null;

        //whether 
        if(previous!=null && previous.length>0)
        {
            //loop through previous cart items
            for(var cart of previous)
            {
                if(cart!=null)
                {
                    //if newly added item is already in cart
                    //update previous entry's qty

                    //if isUpdate or isRemove enabled get newitem's product reference from cart -> 'previous' loop variable
                    if((isUpdate$||isRemove$) && newItem.cart._id==cart._id)
                    {
                        // get product reference for new item
                        newItem.product = cart.product;
                    }

                    /*
                        either 
                            isUpdate/isremove is true and new item's cart id is same as the current loop cart id
                        or
                            it is an add-new-item request and product ids of both new cart item and loop cart item are the same
                        then
                            item 'may' already present in cart
                    */
                    if(((isUpdate$||isRemove$) && cart._id == newItem.cart._id) ||
                     (!isUpdate$ && newItem.product!==null && 
                        cart.product._id == 
                        newItem.product._id))
                    {
                        //check difference in options

                        // check size option
                        if(!isUpdate$ && !isRemove$ && (cart.selSizeOption!=null && newItem.cart.selSizeOption!=null)
                            && (cart.selSizeOption.value != newItem.cart.selSizeOption.value)
                            )
                        {
                            //not a similar item, so not able to continue
                        }
                        // check additional option
                        else if(!isUpdate$ && !isRemove$ && (cart.selAdditionalOption!=null && newItem.cart.selAdditionalOption!=null)
                        && (cart.selAdditionalOption.value != newItem.cart.selAdditionalOption.value)
                        )
                        {
                            //not a similar item, so not able to continue
                        }
                        else{

                            //item is already present in cart

                            //set the flag
                            isAlrdy = true;

                            //new quantity
                            var nQ = 0;

                            // not for a remove operation
                            if(!isRemove$)
                            {
                                if(isUpdate$) // directly update item qty
                                    nQ = newItem.cart.qty;
                                else
                                    nQ = cart.qty + newItem.cart.qty; //new quantity is the sum of previous and new item quantity

                                //check for item availability conflict
                                if(nQ>newItem.product.availability)
                                {
                                    //resolve to get maximum qty to current cart
                                    nQ = newItem.product.availability;
                                }

                                //set new quantity to the item already in cart
                                cart.qty = nQ;
                                
                                //for cart item update
                                if(isUpdate$)
                                {
                                    //copy options to cart reference for which it going to become pUI - (previous Updatable Item)
                                    cart.selSizeOption = newItem.cart.selSizeOption;
                                    cart.selAdditionalOption = newItem.cart.selAdditionalOption;
                                }
                            }
                            
                            
                             // this require an UPDATION to db
                            //so save a reference to (previous Updatable Item)
                            pUI = cart;
                        }
                    }

                    //calculate discount and gross amount
                    //if discount is not mentioned as a percentage assign it directly
                    var d = ((cart.product.isDiscPercent)?(cart.product.price*cart.product.discount/100):(cart.product.discount));
                    var ga = (cart.product.price-d);

                    //compile options
                        
                        // Size options, calculate gross amount
                        if(cart.selSizeOption && cart.selSizeOption.value>0)
                        {
                            ga +=((cart.selSizeOption.isDec)?-1:1)*(((cart.selSizeOption.valueType==100)?(
                                ga*cart.selSizeOption.value/100
                            ):(
                                cart.selSizeOption.value
                            )));
                        }

                        // additional options, calculate gross amount
                        if(cart.selAdditionalOption && cart.selAdditionalOption.value>0)
                        {
                            ga +=((cart.selAdditionalOption.isDec)?-1:1)*(((cart.selAdditionalOption.valueType==100)?(
                                ga*cart.selAdditionalOption.value/100
                            ):(
                                cart.selAdditionalOption.value
                            )));
                        }

                    //consider number of items for gross amount
                    ga = ga * cart.qty;
                    
                    //calculate taxes
                    var tx = 0;
                    //if this product has any tax entry
                    if(cart.product.tax && cart.product.tax.length>0)
                    {
                        //loop through the taxes of the product
                        for(var tax of cart.product.tax)
                        {
                            if(tax.value>0)
                            {
                                //tax percentage of ga
                                var txTmp = (ga*tax.value/100)
                                tx += txTmp;

                                //flag for a matched tax pushed to output
                                var pushed = false;

                                //loop through the taxs in output
                                for(var txa of amount.tax)
                                {
                                    //for a match is found
                                    if(txa.title==tax.title)
                                    {
                                        //update the value of tax entry, which is already there in amount output
                                        txa.value += txTmp;
                                        pushed = true;
                                    }
                                }

                                //if this tax is not present in amount output, push it here
                                if(!pushed) amount.tax.push({title:tax.title, value:txTmp});
                            }
                        }
                    }

                    //sum up the gross amount, gross discount and net amount for output
                    if(!(isRemove$ && cart._id != newItem.cart._id))
                    {
                        amount.grossAmount += ga;
                        amount.grossDiscount += (d*cart.qty);
                        amount.netAmount += (ga+tx);
                    }
                }
            }
        }

        //for a new item that is not present already and this is not an update/remove request
        if(!isAlrdy && !isUpdate$ && !isRemove$)
        {
            // new item is not there in previous

            //so calculate the necessaries

            //calculate discount and gross amount
            //if discount is not mentioned as a percentage assign it directly
            var d = ((newItem.product.isDiscPercent)?(newItem.product.price*newItem.product.discount/100):(newItem.product.discount));
            var ga = (newItem.product.price-d);

            //compile options
                        
                // Size options, calculate gross amount
                if(newItem.cart.selSizeOption && newItem.cart.selSizeOption.value>0)
                {
                    ga +=((newItem.cart.selSizeOption.isDec)?-1:1)*(((newItem.cart.selSizeOption.valueType==100)?(
                        ga*newItem.cart.selSizeOption.value/100
                    ):(
                        newItem.cart.selSizeOption.value
                    )));
                }

                // additional options, calculate gross amount
                if(newItem.cart.selAdditionalOption && newItem.cart.selAdditionalOption.value>0)
                {
                    ga +=((newItem.cart.selAdditionalOption.isDec)?-1:1)*(((newItem.cart.selAdditionalOption.valueType==100)?(
                        ga*newItem.cart.selAdditionalOption.value/100
                    ):(
                        newItem.cart.selAdditionalOption.value
                    )));
                }
            
            //consider number of items for gross amount
            ga = ga*newItem.cart.qty;
                
            //calculate taxes
            var tx = 0;
            //if this product has any tax entry
            if(newItem.product.tax && newItem.product.tax.length>0)
            {
                //loop through the taxes of the product
                for(var tax of newItem.product.tax)
                {
                    if(tax.value>0)
                    {
                        //tax percentage of ga
                        var txTmp = (ga*tax.value/100)
                        tx += txTmp;

                        //flag for a matched tax pushed to output
                        var pushed = false;

                        //loop through the taxs in output
                        for(var txa of amount.tax)
                        {
                            //for a match is found
                            if(txa.title==tax.title)
                            {
                                //update the value of tax entry, which is already there in amount output
                                txa.value += txTmp;
                                pushed = true;
                            }
                        }

                        //if this tax is not present in amount output, push it here
                        if(!pushed) amount.tax.push({title:tax.title, value:txTmp});
                    }
                }
            }
            
            //sum up the gross amount, gross discount and net amount for output
            amount.grossAmount += ga;
            amount.grossDiscount += (d*newItem.cart.qty);
            amount.netAmount += (ga+tx);

            //return amount, but no similar item present in cart so set pUI (previous Updatable Item) as null
            return {amount:amount, pUI:null};
        }
        else{

            //new item appended to previous
            //return and update that pUI (previous Updatable Item) which is similar to new item
            return {amount:amount, pUI:pUI};
        }

    }
    /* ... other calculations */
}
