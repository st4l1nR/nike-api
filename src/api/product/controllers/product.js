"use strict";

/**
 *  product controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::product.product", ({ strapi }) => ({
  async generateVariants(ctx) {
    const cartesian = (...a) =>
      a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));

    try {
      const { id } = ctx.params;
      const product = await strapi.db.query("api::product.product").findOne({
        where: { id },
        populate: ["options.values"],
      });

      const optionsNames = product.options.map((option) => option.name);
      const optionsValues = product.options.map((option) =>
        option.values.map((value) => value.name)
      );

      let variants = cartesian(...optionsValues);
      variants = variants.map((variant, idx) => {
        const selectedOptions = [variant].flat(1).reduce(
          (prv = {}, crr, idx) => ({
            [optionsNames[idx]]: crr,
            ...prv,
          }),
          {}
        );
        return {
          name: [variant].flat(1).join("/"),
          price: product.price,
          selectedOptions: selectedOptions,
          product: product.id,
        };
      });

      await Promise.all(
        variants.map(
          async (variant) =>
            await strapi.db.query("api::variant.variant").create({
              data: variant,
            })
        )
      );

      ctx.send(variants);
    } catch (err) {
      ctx.body = err;
    }
  },
}));
