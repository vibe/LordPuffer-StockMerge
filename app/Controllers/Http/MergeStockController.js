'use strict'
const Helpers = use('Helpers')
const fs = require('fs-extra')
const removeFile = Helpers.promisify(fs.unlink)
const csv=require('csvtojson')
var json2csv = require('json2csv');

function toJSON(path) {
    return new Promise((resolve, reject) => {
        csv().fromFile(path).on('end_parsed', (json) => {
            return resolve(json);
        })
    })
}



class MergeStockController {
    async index({ request, response }) {
        try {
            await fs.remove(`${Helpers.tmpPath('uploads')}`)
        } catch (e) {
            //
        }
        const originalStock = request.file('originalStock')
        const updatedStock = request.file('updatedStock')
        await originalStock.move(Helpers.tmpPath('uploads'))
        await updatedStock.move(Helpers.tmpPath('uploads'))






       const ogJson = await toJSON(Helpers.tmpPath('uploads') + '/' + originalStock.toJSON().fileName);
       const upJson = await toJSON(Helpers.tmpPath('uploads') + '/' + updatedStock.toJSON().fileName);
       

            const updatedFile = ogJson.map(product => {
            const sku = product['meta:purchase_sku'] || product['meta:skuId'];
            if (!sku) {
                return product
            }
            if(product.sku == 'A3883') {
                console.log(product);
            }
            if( product['meta:skuId']) {
                product['meta:purchase_sku'] =  product['meta:skuId']
                product['meta:skuId'] = '';
            }


            const matchedSku = upJson.filter(product => {    
                            
                if(product.skuId){
                    return product.skuId === sku
                }
                if(product["sku Id"]) {
                    return product["sku Id"] === sku
                }

                return false
            })

            if(matchedSku.length === 0) {
                return product;
            }
            // console.log(product, sku, matchedSku)
            const match = matchedSku[0]

            const stock = match.QuantityInStock || match["Quantity In Stock"]

            product.stock = stock
            product["manage_stock"] = 'yes'

            stock == 0 ? product["stock_status"] = "outofstock" : product["stock_status"] = "instock"

            return product;

        })

        // console.log(updatedFile, {})
        var csv = await json2csv({ data: updatedFile});
        
        fs.writeFile(`${Helpers.tmpPath('uploads')}/update.csv`, csv, function(err) {
          if (err) throw err;
          console.log('file saved');
        });

        await removeFile(Helpers.tmpPath('uploads') + '/' + originalStock.toJSON().fileName)
        await removeFile(Helpers.tmpPath('uploads') + '/' + updatedStock.toJSON().fileName)
        response.attachment(
            `${Helpers.tmpPath('uploads')}/update.csv`
        )

     }
}

module.exports = MergeStockController
