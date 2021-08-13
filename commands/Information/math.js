const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const math = require('mathjs');

module.exports = class Math extends Command {
  constructor (client) {
    super(client, {
      name: 'math',
      description: 'Solve some math equations',
      usage: 'math <math equation>',
      category: 'Information'
    });
  }

  async run (msg, args) {
    const text = args.join(' ');

    if (!text || text.length < 1) {
      return msg.channel.send(`Please supply a mathematical equation \n${msg.settings.prefix}math <equation>`);
    }

    try {
      const solution = math.evaluate(text);
      const embed = new DiscordJS.MessageEmbed()
        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
        .setColor('#767CC1')
        .addField('**📥 Expression**', `\`\`\`${text.length > 1000 ? text.slice(0, 1000) + '...' : text}\`\`\``, false)
        .addField('**📤 Result**', `\`\`\`${solution}\`\`\``, false);
      return msg.channel.send({embeds: [embed]});
    } catch (err) {
      return msg.channel.send(`Sorry, I couldn't solve that equation. \`${err}\``);
    }
  }
};
