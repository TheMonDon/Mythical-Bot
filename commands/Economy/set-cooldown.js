const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const { stripIndents } = require('common-tags');

class SetCooldown extends Command {
  constructor(client) {
    super(client, {
      name: 'set-cooldown',
      category: 'Economy',
      description: 'Set the cooldown of economy modules',
      usage: 'set-cooldown <work | rob | crime | slut | chat> <cooldown>',
      aliases: ['setcooldown'],
      examples: ['set-cooldown work 30 seconds', 'set-cooldown work 2 weeks'],
      guildOnly: true,
    });
  }

  run(msg, args) {
    let type;
    const types = ['rob', 'work', 'crime', 'slut'];

    // Get the cooldowns from the database
    const robCooldown = db.get(`servers.${msg.guild.id}.economy.rob.cooldown`) || 600;
    const workCooldown = db.get(`servers.${msg.guild.id}.economy.work.cooldown`) || 300;
    const slutCooldown = db.get(`servers.${msg.guild.id}.economy.slut.cooldown`) || 600;
    const crimeCooldown = db.get(`servers.${msg.guild.id}.economy.crime.cooldown`) || 600;
    const chatCooldown = db.get(`servers.${msg.guild.id}.economy.chat.cooldown`) || 60;

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() });

    if (!args || args.length < 1) {
      embed.setColor('#04ACF4').setDescription(stripIndents`
      The current cooldowns are set to: 
      
      \`Work\`   - ${workCooldown} seconds
      \`Rob\`    - ${robCooldown} seconds
      \`Crime\`  - ${crimeCooldown} seconds
      \`Slut\`   - ${slutCooldown} seconds
      \`Chat\`   - ${chatCooldown} seconds

      Manage Guild is required to change values.
      
      Usage: ${msg.settings.prefix + this.help.usage}
      Examples: ${this.help.examples.join('\n')}

      `);
      return msg.channel.send({ embeds: [embed] });
    } else {
      type = args[0].toLowerCase();
      if (!types.includes(type))
        return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    args.shift();
    const time = args.join(' ');
    const cooldown = ms(time);
    const properCase = this.client.util.toProperCase(type);

    if (cooldown > 1209600000) {
      return this.client.util.errorEmbed(msg, "Cooldowns can't be longer than 2 weeks.", 'Invalid Cooldown');
    } else if (cooldown < 30000) {
      return this.client.util.errorEmbed(msg, "Cooldowns can't be shorter than 30 seconds.", 'Invalid Cooldown');
    } else if (isNaN(cooldown)) {
      return this.client.util.errorEmbed(msg, 'Please provide a valid cooldown time.', 'Invalid Cooldown');
    }

    const cd = cooldown / 1000;
    db.set(`servers.${msg.guild.id}.economy.${type}.cooldown`, cd);

    embed.setColor('#64BC6C').setDescription(`The cooldown of \`${properCase}\` has been set to ${cd} seconds.`);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetCooldown;
