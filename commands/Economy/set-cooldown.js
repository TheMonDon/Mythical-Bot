/* eslint-disable no-unused-vars */
const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const ms = require('ms');
const {
  stripIndents
} = require('common-tags');

module.exports = class BalanceCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'set-cooldown',
      category: 'Economy',
      description: 'Set the cooldown of economy modules',
      usage: 'Set-Cooldown <work | rob | crime> <cooldown>',
      aliases: ['scd', 'setcooldown'],
      guildOnly: true
    });    
  }

  run (msg, args) {
    const server = msg.guild;
    const p = msg.settings.prefix;
    let type;

    const types = ['rob', 'work', 'crime'];

    const usage = `${p}Set-Cooldown <work | rob | crime> <cooldown> \nExample: ${p}Set-Cooldown work 30 seconds`;
    const rob_cooldown = db.get(`servers.${server.id}.economy.rob.cooldown`) || 600; // get cooldown from database or set to 600 seconds (10 minutes)
    const work_cooldown = db.get(`servers.${server.id}.economy.work.cooldown`) || 300; // get cooldown from database or set to 300 seconds
    const slut_cooldown = '';
    const crime_cooldown = db.get(`servers.${server.id}.economy.crime.cooldown`) || 600;

    if (!args || args.length < 1) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#04ACF4')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(stripIndents`
      The current cooldowns are set to: 
      
      \`Work\` - ${work_cooldown} seconds
      \`Rob\` - ${rob_cooldown} seconds
      \`Crime\` - ${crime_cooldown} seconds

      Manage Guild is required to change values.
      
      Usage: ${usage}
      `);
      return msg.channel.send(embed);
    } else {
      type = args[0].toLowerCase();
      if (!types.includes(type)) {
        const embed = new DiscordJS.MessageEmbed()
          .setColor('#EC5454')
          .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
          .setDescription(`Incorrect Usage: ${usage}`);
        return msg.channel.send(embed);
      }
    }

    args.shift();
    const time = args.join(' ');
    const cooldown = ms(time);

    if (cooldown > 1209600000) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(stripIndents`
            :x: Invalid cooldown. Cooldowns can not be longer than 2 weeks.
    
            Usage: ${usage}
            `);

      return msg.channel.send(embed);
    } else if (cooldown < 30000) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(stripIndents`
            :x: Invalid cooldown. Cooldowns can not be shorter than 30 seconds.

            Usage: ${usage}
            `);

      return msg.channel.send(embed);
    } else if (isNaN(cooldown)) {
      const embed = new DiscordJS.MessageEmbed()
        .setColor('#EC5454')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(stripIndents`
            :x: Invalid cooldown. Please provide a valid cooldown time.

            Usage: ${usage}
            `);

      return msg.channel.send(embed);
    }

    if (type === 'work') {
      const cd = cooldown / 1000;
      db.set(`servers.${server.id}.economy.work.cooldown`, cd);

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#64BC6C')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`The cooldown of \`Work\` has been set to ${cd} seconds. \nThis will be displayed in a nice way later`);
      return msg.channel.send(embed);
    } else if (type === 'rob') {
      const cd = cooldown / 1000;
      db.set(`servers.${server.id}.economy.rob.cooldown`, cd);

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#64BC6C')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`The cooldown of \`Rob\` has been set to ${cd} seconds. \nThis will be displayed in a nice way later`);
      return msg.channel.send(embed);
    } else if (type === 'crime') {
      const cd = cooldown / 1000;
      db.set(`servers.${server.id}.economy.crime.cooldown`, cd);

      const embed = new DiscordJS.MessageEmbed()
        .setColor('#64BC6C')
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(`The cooldown of \`Crime\` has been set to ${cd} seconds. \nThis will be displayed in a nice way later `);
      return msg.channel.send(embed);
    }
  }
};
