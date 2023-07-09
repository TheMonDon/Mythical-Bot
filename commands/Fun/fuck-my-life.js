const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const randomfmylife = require('randomfmylife');

class FuckMyLife extends Command {
  constructor(client) {
    super(client, {
      name: 'fuck-my-life',
      description: 'Get a random Fuck My Life story from fmylife.com.',
      usage: 'fuck-my-life',
      category: 'Fun',
      aliases: ['fml', 'fuckmylife', 'fmylife'],
    });
  }

  async run(msg) {
    const text = await randomfmylife();

    const embed = new EmbedBuilder()
      .setTitle('Fuck my Life, Random Edition!')
      .setColor(msg.settings.embedColor)
      .setThumbnail('http://i.imgur.com/5cMj0fw.png')
      .setFooter({ text: `Requested by: ${msg.author.username} | Powered By fmylife.com` })
      .setDescription(`\`\`\`${text}\`\`\``);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = FuckMyLife;
