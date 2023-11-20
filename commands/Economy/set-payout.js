const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class SetPayout extends Command {
  constructor(client) {
    super(client, {
      name: 'set-payout',
      category: 'Economy',
      description: 'Sets the payout of the economy commands',
      usage: 'set-payout <work | crime | slut | chat> <min | max> <amount>',
      aliases: ['setpayout'],
      examples: ['set-payout work min 100', 'set-payout crime max 170000'],
      guildOnly: true,
    });
  }

  async run(msg, text) {
    const types = ['work', 'crime', 'slut', 'chat'];

    if (!msg.member.permissions.has('ManageMessages'))
      return msg.channel.send('You are missing **Manage Guild** permission.');

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    const workMin = (await db.get(`servers.${msg.guild.id}.economy.work.min`)) || 50;
    const workMax = (await db.get(`servers.${msg.guild.id}.economy.work.max`)) || 500;
    const slutMin = (await db.get(`servers.${msg.guild.id}.economy.slut.min`)) || 100;
    const slutMax = (await db.get(`servers.${msg.guild.id}.economy.slut.max`)) || 1000;
    const crimeMin = (await db.get(`servers.${msg.guild.id}.economy.crime.min`)) || 500;
    const crimeMax = (await db.get(`servers.${msg.guild.id}.economy.crime.max`)) || 2000;
    const chatMin = (await db.get(`servers.${msg.guild.id}.economy.chat.min`)) || 10;
    const chatMax = (await db.get(`servers.${msg.guild.id}.economy.chat.max`)) || 100;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!text || text.length < 1) {
      embed.setColor('#04ACF4').setDescription(stripIndents`
          The current payout ranges are: 
        
          \`Work\`  - min: ${currencySymbol}${workMin}  | max: ${currencySymbol}${workMax}
          \`Crime\` - min: ${currencySymbol}${crimeMin} | max: ${currencySymbol}${crimeMax}
          \`Slut\`  - min: ${currencySymbol}${slutMin}  | max: ${currencySymbol}${slutMax}
          \`Chat\`  - min: ${currencySymbol}${chatMin}  | max: ${currencySymbol}${chatMax}
    
          Usage: ${msg.settings.prefix + this.help.usage}
        `);
      return msg.channel.send({ embeds: [embed] });
    }

    const type = text[0]?.toLowerCase();
    if (!types.includes(type))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    const minMax = text[1]?.toLowerCase();
    if (!['min', 'max'].includes(minMax))
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    text.shift();
    text.shift();
    const amount = text
      .join('')
      .replace(/[^0-9\\.]/g, '')
      .replace(/-/g, '');

    if (isNaN(amount)) return this.client.util.errorEmbed(msg, 'Please provide a valid number', 'Invalid Payout');

    if (amount > 1000000000000) {
      return msg.channel.send('The maximum amount for payout is one trillion.');
    } else if (amount < 1) {
      return msg.channel.send('The minimum amount for payout is one.');
    }

    await db.set(`servers.${msg.guild.id}.economy.${type}.${minMax}`, amount);
    const longMinMax = minMax === 'min' ? 'minimum' : 'maximum';
    embed
      .setDescription(
        `The ${longMinMax} amount for \`${this.client.util.toProperCase(
          type,
        )}\` has been changed to ${currencySymbol}${amount}`,
      )
      .setColor('#64BC6C');
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = SetPayout;
