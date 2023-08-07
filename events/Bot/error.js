module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(error) {
    const string = JSON.stringify(error);
    if (string.length === 2) {
      console.log(error);
      return this.client.logger.error(string);
    }

    return this.client.logger.error(string);
  }
};
