const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class CreateItem extends Command {
  constructor(client) {
    super(client, {
      name: 'create-item',
      category: 'Items',
      description: 'Create an item to be shown in the store.',
      usage: 'create-item <item name>',
      longDescription: 'Create an item to be shown in the store. The item name will be cut off at 200 characters',
      aliases: ['createitem'],
      permLevel: 'Administrator',
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const name = args.join(' ').slice(0, 200);
    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};
    const filter = (m) => m.author.id === msg.author.id;
    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .addFields([{ name: 'Name', value: name, inline: true }])
      .setFooter({ text: 'Type cancel to quit.' })
      .setTimestamp();

    // Find the item in the store regardless of case
    const item = Object.keys(store).find((key) => key.toLowerCase() === name);
    if (item) {
      const noItemEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedErrorColor)
        .setDescription('There is already an item with that name.');

      return msg.channel.send({ embeds: [noItemEmbed] });
    }

    const message = await msg.channel.send({ content: 'What would you like the price to be?', embeds: [embed] });

    let collected = await msg.channel
      .awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ['time'],
      })
      .catch(() => null);
    if (!collected) return msg.reply('You did not reply in time, the command has been cancelled.');
    if (collected.first().content.toLowerCase() === 'cancel') return msg.reply('The command has been cancelled.');

    let cost = parseInt(
      collected
        .first()
        .content.toLowerCase()
        .replace(/[^0-9\\.]/g, ''),
    );
    if (isNaN(cost)) return msg.reply('The cost must be a number. Command has been cancelled.');
    if (cost === Infinity) {
      msg.reply(`The cost must be less than Infinity. The cost has been set to ${Number.MAX_VALUE.toLocaleString()}.`);
      cost = Number.MAX_VALUE;
    }
    if (cost < 0) {
      msg.reply('The cost must be at least zero, therefore the cost has been set to zero.');
      cost = 0;
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    embed.addFields([{ name: 'Cost', value: currencySymbol + cost.toLocaleString(), inline: true }]);

    await message.edit({ content: 'What would you like the description to be?', embeds: [embed] });
    collected = await msg.channel
      .awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ['time'],
      })
      .catch(() => null);
    if (!collected) return msg.reply('You did not reply in time, the command has been cancelled.');
    if (collected.first().content.toLowerCase() === 'cancel') return msg.reply('The command has been cancelled.');

    const description = collected.first().content.slice(0, 1024);
    embed.addFields([{ name: 'Description', value: description, inline: true }]);

    store[name] = {
      cost,
      description,
    };

    await db.set(`servers.${msg.guild.id}.economy.store`, store);
    return message.edit({ content: ':white_check_mark: Item created successfully!', embeds: [embed] });
  }
}

module.exports = CreateItem;
