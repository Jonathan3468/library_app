const Joi = require("joi");

const createBookSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),

  isbn: Joi.string().trim().allow(null, ""),

  publication_year: Joi.number()
    .integer()
    .min(1000)
    .max(new Date().getFullYear())
    .required(),

  publication_id: Joi.number().integer().required(),

  category_id: Joi.number().integer().required(),

  authorIds: Joi.array()
    .items(Joi.number().integer())
    .min(1)
    .required(),

  genreIds: Joi.array()
    .items(Joi.number().integer())
    .min(1)
    .required()
});

module.exports = {
  createBookSchema
};
