const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class SetFineAmount extends Command {
  constructor(client) {
    super(client, {
      name: 'set-fine-amount',
      category: 'Economy',
      description: 'Sets the fine amount of the economy commands',
      usage: 'set-fine-amount <crime | slut | rob> <min | max> <amount>',
      aliases: ['setfine', 'setfineamount'],
      examples: ['set-fine-amount slut min 10', 'set-fine-amount crime max 30'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const types = ['crime', 'slut', 'rob'];

    const crimeMin = (await db.get(`servers.${msg.guild.id}.economy.crime.fine.min`)) || 10;
    const crimeMax = (await db.get(`servers.${msg.guild.id}.economy.crime.fine.max`)) || 30;
    const slutMin = (await db.get(`servers.${msg.guild.id}.economy.slut.fine.min`)) || 10;
    const slutMax = (await db.get(`servers.${msg.guild.id}.economy.slut.fine.max`)) || 30;
    const robMin = (await db.get(`servers.${msg.guild.id}.economy.rob.fine.min`)) || 10;
    const robMax = (await db.get(`servers.${msg.guild.id}.economy.rob.fine.max`)) || 30;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!args || args.length < 1) {
      embed.setColor(msg.settings.embedColor).setDescription(stripIndents`
          The current fine ranges are: 
        
          \`Crime\` - min: ${crimeMin}% | max: ${crimeMax}%
          \`Slut\`  - min: ${slutMin}%  | max: ${slutMax}%
          \`Rob\`  - min: ${robMin}%  | max: ${robMax}%
    
          Usage: ${msg.settings.prefix + this.help.usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }

    const type = args[0]?.toLowerCase();
    if (!types.includes(type))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    const minMax = args[1]?.toLowerCase();
    if (!['min', 'max'].includes(minMax))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    args.shift();
    args.shift();
    const amount = args
      .join('')
      .replace(/[^0-9].*/, '')
      .replace(/[^0-9]/g, '');

    if (isNaN(amount)) return this.client.util.errorEmbed(msg, 'Please provide a valid number', 'Invalid Fine Amount');

    if (amount > 100) {
      return msg.channel.send('The maximum fine amount is one hundred percent.');
    } else if (amount < 1) {
      return msg.channel.send('The minimum fine amount is one percent.');
    }

    await db.set(`servers.${msg.guild.id}.economy.${type}.fine.${minMax}`, amount);
    const longMinMax = minMax === 'min' ? 'minimum' : 'maximum';
    embed
      .setDescription(
        `The ${longMinMax} amount for \`${this.client.util.toProperCase(type)}\` has been changed to ${amount}%`,
      )
      .setColor(msg.settings.embedSuccessColor);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetFineAmount;
