const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class SetFailRate extends Command {
  constructor (client) {
    super(client, {
      name: 'set-fail-rate',
      category: 'Economy',
      description: 'Sets the fail rate of economy commands',
      usage: 'set-fail-rate <crime> <percentage>',
      aliases: ['setfailrate', 'setfail'],
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  run (msg, text) {
    const types = ['crime'];

    const usage = `${msg.settings.prefix}set-fail-rate <crime> <percentage>`;

    // const slutFail = db.get(`servers.${msg.guild.id}.economy.slut.failrate`) || 35;
    const crimeFail = db.get(`servers.${msg.guild.id}.economy.crime.failrate`) || 45;

    if (!text || text.length < 1) {
      const embed = new EmbedBuilder()
        .setColor('#04ACF4')
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(stripIndents`
        The current fail rates are: 
        
        \`Crime\` - ${crimeFail}%
    
        Usage: ${usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }

    const errEmbed = new EmbedBuilder()
      .setColor('#EC5454')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    const type = text[0]?.toLowerCase();
    if (!types.includes(type)) {
      errEmbed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    text.shift();
    const percentage = parseInt(text.join('').replace('%', '').replace(/-/g, ''), 10);

    if (isNaN(percentage)) {
      const embed = new EmbedBuilder()
        .setColor('#EC5454')
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(stripIndents`
          :x: Invalid fail rate. Please provide a valid number.

          Usage: ${usage}
        `);

      return msg.channel.send({ embeds: [embed] });
    } else if (percentage > 100) {
      errEmbed.setDescription(stripIndents`
        :x: Invalid fail rate. Percenage can not be greater than 100%.

        Usage: ${usage}
      `);
      return msg.channel.send({ embeds: [errEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor('#64BC6C')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (type === 'crime') {
      db.set(`servers.${msg.guild.id}.economy.crime.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Crime\` has been set to ${percentage}%.`);

      return msg.channel.send({ embeds: [embed] });
    } else if (type === 'slut') { // Shoved this in for future proofing :D
      db.set(`servers.${msg.guild.id}.economy.slut.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Slut\` has been set to ${percentage}%.`);
    }

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetFailRate;
