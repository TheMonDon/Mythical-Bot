const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const math = require('mathjs');

class Ping extends Command {
  constructor (client) {
    super(client, {
      name: 'math',
      description: 'Solve some math equations.',
      usage: 'math',
      category: 'Information',
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars
    const text = args.join(' ');
    
    if (!text || text.length < 1) {
      msg.channel.send('Please type something to evaluate.');
    } else {
      let solution;
      try {
        solution = math.evaluate(text);
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#767CC1')
          .addField('**📥 Expression**', `\`\`\`${text}\`\`\``)
          .addField('**📤 Result**', `\`\`\`${solution}\`\`\``);
        msg.channel.send(embed);
      } catch (err) {
        msg.channel.send(`Sorry, I couldn't solve that equation. \`${err}\``);
      }
    }}
}

module.exports = Ping;
