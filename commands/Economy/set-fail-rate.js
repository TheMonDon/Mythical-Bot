const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

module.exports = class setFailRate extends Command {
  constructor (client) {
    super(client, {
      name: 'set-fail-rate',
      category: 'Economy',
      description: 'Sets the fail rate of economy commands',
      usage: 'set-fail-rate <crime> <percentage>',
      aliases: ['setfailrate', 'setfail'],
      guildOnly: true
    });
  }

  run (msg, text) {
    const types = ['crime'];

    if (!msg.member.permissions.has('MANAGE_GUILD')) return msg.channel.send('You are missing **Manage Guild** permission.');

    const usage = `${msg.settings.prefix}set-fail-rate <crime> <percentage>`;

    // const slutFail = db.get(`servers.${server.id}.economy.slut.failrate`) || 35;
    const crimeFail = db.get(`servers.${msg.guild.id}.economy.crime.failrate`) || 45;

    if (!text || text.length < 1) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#04ACF4')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(stripIndents`
        The current fail rates are: 
        
        \`Crime\` - ${crimeFail}%
    
        Usage: ${usage}
        `);
      return msg.channel.send(embed);
    }

    const errEmbed = new DiscordJS.MessageEmbed()
      .setColor('#EC5454')
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL());

    const type = text[0]?.toLowerCase();
    if (!types.includes(type)) {
      errEmbed.setDescription(`Incorrect Usage: ${usage}`);
      return msg.channel.send(errEmbed);
    }

    text.shift();
    const percentage = parseInt(text.join('').replace('%', '').replace(/-/g, ''), 10);

    if (isNaN(percentage)) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(stripIndents`
          :x: Invalid fail rate. Please provide a valid number.

          Usage: ${usage}
        `);

      return msg.channel.send(embed);
    } else if (percentage > 100) {
      errEmbed.setDescription(stripIndents`
        :x: Invalid fail rate. Percenage can not be greater than 100%.

        Usage: ${usage}
      `);
      return msg.channel.send(errEmbed);
    }

    const embed = new DiscordJS.MessageEmbed()
      .setColor('#64BC6C')
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL());

    if (type === 'crime') {
      db.set(`servers.${msg.guild.id}.economy.crime.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Crime\` has been set to ${percentage}%.`);

      return msg.channel.send(embed);
    } else if (type === 'slut') { // Shoved this in for future proofing :D
      db.set(`servers.${msg.guild.id}.economy.slut.failrate`, percentage);
      embed.setDescription(`The fail rate for \`Slut\` has been set to ${percentage}%.`);
    }

    return msg.channel.send(embed);
  }
};
