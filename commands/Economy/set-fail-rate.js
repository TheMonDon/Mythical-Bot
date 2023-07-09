const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class SetFailRate extends Command {
  constructor(client) {
    super(client, {
      name: 'set-fail-rate',
      category: 'Economy',
      description: 'Sets the fail rate of economy commands',
      usage: 'set-fail-rate <crime | slut> <percentage>',
      aliases: ['setfailrate', 'setfail'],
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  run(msg, text) {
    const types = ['crime', 'slut'];
    const errorColor = msg.settings.embedErrorColor;

    const usage = `${msg.settings.prefix}set-fail-rate <crime | slut> <percentage>`;

    const slutFail = db.get(`servers.${msg.guild.id}.economy.slut.failrate`) || 35;
    const crimeFail = db.get(`servers.${msg.guild.id}.economy.crime.failrate`) || 45;

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(errorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (!text || text.length < 1) {
      embed.setColor('#04ACF4').setDescription(stripIndents`
        The current fail rates are: 
        
        \`Crime\` - ${crimeFail}%
        \`Slut\`  - ${slutFail}%
    
        Usage: ${usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }

    const type = text[0]?.toLowerCase();
    if (!types.includes(type)) {
      embed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [embed] });
    }

    text.shift();
    const percentage = parseInt(text.join('').replace('%', '').replace(/-/g, ''), 10);

    if (isNaN(percentage)) {
      embed.setDescription(stripIndents`
          :x: Invalid fail rate. Please provide a valid number.

          Usage: ${usage}
        `);

      return msg.channel.send({ embeds: [embed] });
    } else if (percentage > 100) {
      embed.setDescription(stripIndents`
        :x: Invalid fail rate. Percenage can not be greater than 100%.

        Usage: ${usage}
      `);
      return msg.channel.send({ embeds: [embed] });
    }

    embed.setColor('#64BC6C');

    if (type === 'crime') {
      db.set(`servers.${msg.guild.id}.economy.${type}.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Crime\` has been set to ${percentage}%.`);

      return msg.channel.send({ embeds: [embed] });
    } else if (type === 'slut') {
      // Shoved this in for future proofing :D (Thanks past me!)
      db.set(`servers.${msg.guild.id}.economy.slut.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Slut\` has been set to ${percentage}%.`);
    }

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetFailRate;
