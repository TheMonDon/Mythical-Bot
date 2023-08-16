const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const math = require('mathjs');

class Math extends Command {
  constructor(client) {
    super(client, {
      name: 'math',
      description: 'Solve some math equations',
      usage: 'math <Equation>',
      category: 'Information',
      aliases: ['calc', 'calculate'],
      examples: ['math 1 + 2', 'math 120cm to in'],
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const text = args.join(' ');

    try {
      const solution = math.evaluate(text);

      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedColor)
        .addFields([
          {
            name: '**📥 Expression**',
            value: `\`\`\`${text.length > 1000 ? text.slice(0, 1000) + '...' : text}\`\`\``,
            inline: false,
          },
          { name: '**📤 Result**', value: `\`\`\`${solution}\`\`\``, inline: false },
        ])
        .setDescription('Powered by: [math.js](https://mathjs.org/examples/index.html)');
      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      return this.client.util.errorEmbed(msg, err.toString(), 'Invalid Equation');
    }
  }
}

module.exports = Math;
