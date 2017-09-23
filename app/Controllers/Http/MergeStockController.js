'use strict'
const Helpers = use('Helpers')
const csv = require('csvjson')
const fs = require('fs')
const jsonToCSV = require('json-to-csv');
const removeFile = Helpers.promisify(fs.unlink)

class MergeStockController {
    async index({ request, response }) {
        try {
            await removeFile(`${Helpers.tmpPath('uploads')}/update.csv`)
        } catch (e) {
            //
        }
        const originalStock = request.file('originalStock')
        const updatedStock = request.file('updatedStock')
        await originalStock.move(Helpers.tmpPath('uploads'))
        await updatedStock.move(Helpers.tmpPath('uploads'))

        const ogStock = fs.readFileSync(Helpers.tmpPath('uploads') + '/' + originalStock.toJSON().fileName, { encoding: 'utf8' });
        const upStock = fs.readFileSync(Helpers.tmpPath('uploads') + '/' + updatedStock.toJSON().fileName, { encoding: 'utf8' });

        const ogJson = await csv.toObject(ogStock, {})
        const upJson = await csv.toObject(upStock, {})


        const updatedFile = ogJson.map(product => {
            const sku = product['meta:purchase_sku'];
            if (!sku) {
                return product
            }

            const matchedSku = upJson.filter(product => {
                return product.skuId === sku
            })

            const match = matchedSku[0]

            const stock = match.QuantityInStock

            product.stock = stock
            product["manage_stock"] = 'yes'

            stock == 0 ? product["stock_status"] = "outofstock" : product["stock_status"] = "instock"

            return product;

        })

        await jsonToCSV(updatedFile, `${Helpers.tmpPath('uploads')}/update.csv`)

        await removeFile(Helpers.tmpPath('uploads') + '/' + originalStock.toJSON().fileName)
        await removeFile(Helpers.tmpPath('uploads') + '/' + updatedStock.toJSON().fileName)
        response.attachment(
            `${Helpers.tmpPath('uploads')}/update.csv`
        )

    }
}

module.exports = MergeStockController
