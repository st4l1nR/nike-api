"use strict";

const stripe = module.require("stripe")(process.env.STRAPI_SECRET_KEY);

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    const { toEntityResponse } = strapi
      .plugin("graphql")
      .service("format").returnTypes;

    const extension = ({
      nexus: { extendType, objectType, arg, idArg, nonNull, intArg, floatArg },
    }) => ({
      types: [
        objectType({
          name: "PaymentIntent",
          definition(t) {
            t.string("clientSecret");
          },
        }),
        extendType({
          type: "Mutation",
          definition(t) {
            t.field("addCartItem", {
              type: "CartEntityResponse",
              args: {
                id: nonNull(idArg()),
                cartItem: arg({
                  type: nonNull("ComponentProductCartItemInput"),
                }),
              },
            });
            t.field("deleteCartItem", {
              type: "CartEntityResponse",
              args: {
                id: nonNull(idArg()),
                cartItemId: nonNull(idArg()),
              },
            });
            t.field("updateCartItem", {
              type: "CartEntityResponse",
              args: {
                id: nonNull(idArg()),
                cartItemId: nonNull(idArg()),
                quantity: nonNull(intArg()),
              },
            });
            t.field("emptyCart", {
              type: "CartEntityResponse",
              args: {
                id: nonNull(idArg()),
              },
            });
            t.field("createPaymentIntent", {
              type: "PaymentIntent",
              args: {
                amount: nonNull(floatArg()),
              },
            });
          },
        }),
      ],
      resolvers: {
        Mutation: {
          addCartItem: {
            async resolve(parent, args, ctx) {
              const { id, cartItem: newCartItem } = args;

              let cart = await strapi.entityService.findOne(
                "api::cart.cart",
                id,
                {
                  populate: {
                    cartItems: {
                      populate: {
                        image: true,
                        variant: true,
                        product: true,
                      },
                    },
                  },
                }
              );

              let isRepeat = false;
              cart.cartItems.forEach((cartItem, idx) => {
                const { product, variant, quantity } = cartItem;

                if (newCartItem.variant && variant) {
                  if (
                    newCartItem.product == product.id &&
                    newCartItem.variant == variant.id
                  ) {
                    cart.cartItems[idx].quantity += newCartItem.quantity;
                    isRepeat = true;
                  }
                } else {
                  if (product.id == newCartItem.product && !variant) {
                    cart.cartItems[idx].quantity += newCartItem.quantity;

                    isRepeat = true;
                  }
                }
              });

              if (!isRepeat) {
                cart.cartItems.push(newCartItem);
              }

              cart.total +=
                Math.round(newCartItem.price * newCartItem.quantity * 100) /
                100;

              const newCart = await strapi.entityService.update(
                "api::cart.cart",
                id,
                { data: cart }
              );

              return toEntityResponse(newCart);
            },
          },
          deleteCartItem: {
            async resolve(parent, args, ctx) {
              const { id, cartItemId } = args;
              let cart = await strapi.entityService.findOne(
                "api::cart.cart",
                id,
                {
                  populate: {
                    cartItems: {
                      populate: {
                        image: true,
                        product: true,
                        variant: true,
                      },
                    },
                  },
                }
              );

              cart.cartItems = cart.cartItems.filter((cartItem) => {
                if (cartItem.id == cartItemId) {
                  cart.total -=
                    Math.round(cartItem.quantity * cartItem.price * 100) / 100;
                  return false;
                }
                return true;
              });

              const newCart = await strapi.entityService.update(
                "api::cart.cart",
                id,
                {
                  data: cart,
                }
              );

              return toEntityResponse(newCart);
            },
          },
          updateCartItem: {
            async resolve(parent, args) {
              const { id, cartItemId, quantity } = args;
              let cart = await strapi.entityService.findOne(
                "api::cart.cart",
                id,
                {
                  populate: {
                    cartItems: {
                      iamge: true,
                      product: true,
                      variant: true,
                    },
                  },
                }
              );

              cart.cartItems = cart.cartItems.map((cartItem) => {
                if (cartItem.id == cartItemId) {
                  cart.total -=
                    Math.round(cartItem.quantity * cartItem.price * 100) / 100;
                  cart.total +=
                    Math.round(quantity * cartItem.price * 100) / 100;
                  return {
                    ...cartItem,
                    quantity,
                  };
                }
                return cartItem;
              });

              const newCart = await strapi.entityService.update(
                "api::cart.cart",
                id,
                {
                  data: cart,
                }
              );

              return toEntityResponse(newCart);
            },
          },

          emptyCart: {
            async resolve(parent, args) {
              const { id } = args;
              const newCart = await strapi.entityService.update(
                "api::cart.cart",
                id,
                {
                  data: {
                    id,
                    cartItems: [],
                    total: 0,
                  },
                }
              );
              return toEntityResponse(newCart);
            },
          },

          createPaymentIntent: {
            async resolve(parent, args) {
              const { amount } = args;
              const { client_secret } = await stripe.paymentIntents.create({
                amount: amount * 100,
                currency: "usd",
                payment_method_types: ["card"],
              });

              return { clientSecret: client_secret };
            },
          },
        },
      },
      resolversConfig: {
        "Mutation.addCartItem": {
          auth: false,
        },
        "Mutation.deleteCartItem": {
          auth: false,
        },
        "Mutation.updateCartItem": {
          auth: false,
        },
        "Mutation.createPaymentIntent": {
          auth: false,
        },
        "Mutation.emptyCart": {
          auth: false,
        },
      },
    });
    strapi.plugin("graphql").service("extension").use(extension);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
