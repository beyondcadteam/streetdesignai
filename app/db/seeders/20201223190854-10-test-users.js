'use strict'
const faker = require('@faker-js/faker')
const users = [...Array(10)].map((user) => ({
  id: faker.internet.userName(),
  email: faker.internet.email(),
  created_at: new Date(),
  updated_at: new Date()
}))

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Users', users, {})
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {})
  }
}
