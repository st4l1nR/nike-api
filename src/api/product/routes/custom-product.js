module.exports = {
    routes:[
        {
            method:"GET",
            path:"/products/:id/generate-variants",
            handler:"product.generateVariants"
        }
    ]
}