const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const { stripIndents } = require('common-tags');
const { toProperCase } = require('../../util/Util.js');

class SetCooldown extends Command {
  constructor (client) {
    super(client, {
      name: 'set-cooldown',
      category: 'Economy',
      description: 'Set the cooldown of economy modules',
      usage: 'Set-Cooldown <work | rob | crime | slut> <cooldown>',
      aliases: ['scd', 'setcooldown'],
      guildOnly: true
    });
  }

  run (msg, args) {
    let type;
    const errorColor = msg.settings.embedErrorColor;

    const types = ['rob', 'work', 'crime', 'slut'];

    const usage = `${msg.settings.prefix}Set-Cooldown <work | rob | crime | slut> <cooldown> \nExample: ${msg.settings.prefix}Set-Cooldown work 30 seconds`;

    // Get the cooldowns from the database
    const robCooldown = db.get(`servers.${msg.guild.id}.economy.rob.cooldown`) || 600;
    const workCooldown = db.get(`servers.${msg.guild.id}.economy.work.cooldown`) || 300;
    const slutCooldown = db.get(`servers.${msg.guild.id}.economy.slut.cooldown`) || 600;
    const crimeCooldown = db.get(`servers.${msg.guild.id}.economy.crime.cooldown`) || 600;

    if (!args || args.length < 1) {
      const embed = new EmbedBuilder()
        .setColor('#04ACF4')
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(stripIndents`
      The current cooldowns are set to: 
      
      \`Work\`   - ${workCooldown} seconds
      \`Rob\`    - ${robCooldown} seconds
      \`Crime\`  - ${crimeCooldown} seconds
      \`Slut\`   - ${slutCooldown} seconds

      Manage Guild is required to change values.
      
      Usage: ${usage}
      `);
      return msg.channel.send({ embeds: [embed] });
    } else {
      type = args[0].toLowerCase();
      if (!types.includes(type)) {
        const embed = new EmbedBuilder()
          .setColor(errorColor)
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send({ embeds: [embed] });
      }
    }

    args.shift();
    const time = args.join(' ');
    const cooldown = ms(time);
    const properCase = toProperCase(type);

    if (cooldown > 1209600000) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(stripIndents`
          :x: Invalid cooldown. Cooldowns can not be longer than 2 weeks.
    
          Usage: ${usage}
        `);

      return msg.channel.send({ embeds: [embed] });
    } else if (cooldown < 30000) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(stripIndents`
          :x: Invalid cooldown. Cooldowns can not be shorter than 30 seconds.

          Usage: ${usage}
        `);

      return msg.channel.send({ embeds: [embed] });
    } else if (isNaN(cooldown)) {
      const embed = new EmbedBuilder()
        .setColor(errorColor)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(stripIndents`
          :x: Invalid cooldown. Please provide a valid cooldown time.

          Usage: ${usage}
        `);

      return msg.channel.send({ embeds: [embed] });
    }

    const cd = cooldown / 1000;
    db.set(`servers.${msg.guild.id}.economy.${type}.cooldown`, cd);

    const embed = new EmbedBuilder()
      .setColor('#64BC6C')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`The cooldown of \`${properCase}\` has been set to ${cd} seconds.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetCooldown;
