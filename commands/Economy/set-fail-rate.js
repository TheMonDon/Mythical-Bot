const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class SetFailRate extends Command {
  constructor(client) {
    super(client, {
      name: 'set-fail-rate',
      category: 'Economy',
      description: 'Sets the fail rate of economy commands',
      usage: 'set-fail-rate <crime | slut> <percentage>',
      aliases: ['setfailrate', 'setfail'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const types = ['crime', 'slut'];
    const errorColor = msg.settings.embedErrorColor;

    const slutFail = (await db.get(`servers.${msg.guild.id}.economy.slut.failrate`)) || 35;
    const crimeFail = (await db.get(`servers.${msg.guild.id}.economy.crime.failrate`)) || 45;

    const embed = new EmbedBuilder()
      .setColor(errorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    if (!args || args.length < 1) {
      embed.setColor(msg.settings.embedColor).setDescription(stripIndents`
        The current fail rates are: 
        
        \`Crime\` - ${crimeFail}%
        \`Slut\`  - ${slutFail}%
    
        Usage: ${this.help.usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }

    const type = args[0]?.toLowerCase();
    if (!types.includes(type))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    args.shift();
    const percentage = parseInt(args.join('').replace('%', '').replace(/-/g, ''), 10);

    if (isNaN(percentage)) {
      return this.client.util.errorEmbed(msg, 'Please provide a valid number.', 'Invalid Fail Rate');
    } else if (percentage > 100) {
      return this.client.util.errorEmbed(msg, "The percentage can't be greater than 100%.", 'Invalid Fail Rate');
    }

    embed.setColor(msg.settings.embedSuccessColor);

    if (type === 'crime') {
      await db.set(`servers.${msg.guild.id}.economy.${type}.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Crime\` has been set to ${percentage}%.`);

      return msg.channel.send({ embeds: [embed] });
    } else if (type === 'slut') {
      // Shoved this in for future proofing :D (Thanks past me!)
      await db.set(`servers.${msg.guild.id}.economy.slut.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Slut\` has been set to ${percentage}%.`);
    }

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetFailRate;
