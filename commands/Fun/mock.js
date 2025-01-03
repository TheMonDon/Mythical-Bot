const Command = require('../../base/Command.js');

class Mock extends Command {
  constructor(client) {
    super(client, {
      name: 'mock',
      description: 'Converts your text to a mocking pattern',
      usage: 'mock <text>',
      examples: ['mock this is fun'],
      category: 'Fun',
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    // Combine user input into one string
    const input = args.join(' ');
    const lengthLimited = this.client.util.limitStringLength(input);
    const mock = await this.client.util.clean(this.client, lengthLimited);

    // Convert to "mOcKiNg" style
    const mockedText = mock
      .split('')
      .map((char, index) => (index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
      .join('');

    return msg.channel.send(mockedText);
  }
}

module.exports = Mock;
