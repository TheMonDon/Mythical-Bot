const Command = require('../../base/Command.js');

class Discrim extends Command {
  constructor (client) {
    super(client, {
      name: 'discrim',
      description: 'Find all the users the bot has with the same discrim',
      usage: 'discrim',
      category: 'Fun',
      aliases: ['disc', 'discriminator']
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars
    const discrim = args.join(' ');
    const output = this.client.users.cache.filter(user => user.discriminator == discrim).map(a => a.tag);
    if (!discrim || discrim.length < 4) {
      return msg.channel.send('Please supply a valid discriminator to search for.');
    }
    
    if (output.length > 0) {
      return msg.channel.send(`\`\`\` ${output} \`\`\``, { split: ','});
    } else {
      return msg.channel.send(`No users found with the discriminator: ${discrim}`);
    }
  }
}

module.exports = Discrim;