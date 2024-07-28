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
    const item = Object.keys(store).find((key) => key.toLowerCase() === name.toLowerCase());
    if (item) {
      const noItemEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedErrorColor)
        .setDescription('There is already an item with that name.');

      return msg.channel.send({ embeds: [noItemEmbed] });
    }

    let cost;
    let collected;
    let isValid = false;

    const message = await msg.channel.send({ content: '1️⃣ What would you like the price to be?', embeds: [embed] });

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }
      if (collected.first().content.toLowerCase() === 'cancel') {
        return msg.reply('The command has been cancelled.');
      }

      cost = parseInt(
        collected
          .first()
          .content.toLowerCase()
          .replace(/[^0-9\\.]/g, ''),
      );

      if (isNaN(cost)) {
        await collected
          .first()
          .reply('The cost must be a valid number. Please enter the price again or type `cancel` to exit.');
      } else if (cost === Infinity) {
        await collected.first().reply(`The price must be less than ${BigInt(Number.MAX_VALUE).toLocaleString()}.`);
      } else if (cost < 0) {
        await msg.reply('The price must be at least zero. Please enter a valid cost.');
      } else {
        isValid = true;
      }
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    embed.addFields([{ name: 'Price', value: currencySymbol + cost.toLocaleString(), inline: true }]);
    await message.edit({
      content: '2️⃣ What would you like the description to be? \nThis should be no more than 1000 characters',
      embeds: [embed],
    });

    isValid = false;
    let description;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) return msg.reply('You did not reply in time, the command has been cancelled.');

      const response = collected.first().content.toLowerCase();
      if (response === 'cancel') {
        return collected.first().reply('The command has been cancelled.');
      }

      description = collected.first().content;
      if (description.length > 1000) {
        collected
          .first()
          .reply(
            'The description must be less than 1000 characters. Please try again or use `cancel` to cancel the command',
          );
      } else {
        isValid = true;
      }
    }
    embed.addFields([{ name: 'Description', value: description, inline: false }]);

    await message.edit({
      content: '3️⃣ Would you like this item to show up in inventory? (yes/no)',
      embeds: [embed],
    });

    isValid = false;
    let inventory;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }

      const response = collected.first().content.toLowerCase();
      if (response === 'cancel') {
        return collected.first().reply('The command has been cancelled.');
      }

      if (!this.client.util.no.includes(response) && !this.client.util.yes.includes(response)) {
        await collected.first().reply('Please answer with either a `yes` or a `no`.');
      } else {
        if (['yes', 'y', 'true'].includes(response)) {
          inventory = true;
          isValid = true;
        } else {
          inventory = false;
          isValid = true;
        }
      }
    }
    embed.addFields([{ name: 'Show in inventory?', value: inventory ? 'Yes' : 'No', inline: true }]);

    await message.edit({
      content: '4️⃣ How much stock of this item will there be? \nIf unlimited, just reply skip or infinity.',
      embeds: [embed],
    });

    isValid = false;
    let stock;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }

      const response = collected.first().content.toLowerCase();
      if (response === 'cancel') {
        return collected.first().reply('The command has been cancelled.');
      }
      if (['skip', 'infinite', 'infinity'].includes(response)) {
        stock = null;
        isValid = true;
        break;
      }

      stock = parseInt(response);
      if (isNaN(stock)) {
        await collected.first().reply('Please answer with a number');
      } else if (stock < 1) {
        await collected.first().reply('Please enter a number larger than zero.');
      } else {
        isValid = true;
        break;
      }
    }
    embed.addFields([{ name: 'Stock Remaining', value: stock == null ? 'Infinity' : stock, inline: true }]);

    await message.edit({
      content:
        '5️⃣ What role must the user already have in order to buy (and use if an inventory item) this item? \nIf none, just reply `skip`.',
      embeds: [embed],
    });

    isValid = false;
    let roleRequired;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }

      const response = collected.first().content.toLowerCase();
      if (response === 'cancel') {
        return collected.first().reply('The command has been cancelled.');
      }
      if (response === 'skip') {
        roleRequired = null;
        isValid = true;
        break;
      }

      roleRequired = this.client.util.getRole(msg, collected.first().content);

      if (!roleRequired) {
        collected.first().reply('Please reply with a valid server role.');
      } else {
        roleRequired = roleRequired.id;
        isValid = true;
      }
    }
    embed.addFields([
      {
        name: 'Role Required',
        value: roleRequired ? this.client.util.getRole(msg, roleRequired)?.toString() : 'None',
        inline: true,
      },
    ]);

    await message.edit({
      content:
        '6️⃣ What role do you want to be given when this item is bought (or used if an inventory item)? \nIf none, just reply `skip`.',
      embeds: [embed],
    });

    isValid = false;
    let roleGiven;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }

      const response = collected.first().content.toLowerCase();
      if (response === 'cancel') {
        return collected.first().reply('The command has been cancelled.');
      }
      if (response === 'skip') {
        roleGiven = null;
        isValid = true;
        break;
      }

      roleGiven = this.client.util.getRole(msg, collected.first().content);

      if (!roleGiven) {
        collected.first().reply('Please reply with a valid server role.');
      } else {
        roleGiven = roleGiven.id;
        isValid = true;
      }
    }
    embed.addFields([
      {
        name: 'Role Given',
        value: roleGiven ? this.client.util.getRole(msg, roleGiven)?.toString() : 'None',
        inline: true,
      },
    ]);

    await message.edit({
      content:
        '7️⃣ What role do you want to be removed from the user when this item is bought (or used if an inventory item)?\nIf none, just reply `skip`.',
      embeds: [embed],
    });

    isValid = false;
    let roleRemoved;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }

      const response = collected.first().content.toLowerCase();
      if (response === 'cancel') {
        return collected.first().reply('The command has been cancelled.');
      }
      if (response === 'skip') {
        roleRemoved = null;
        isValid = true;
        break;
      }

      roleRemoved = this.client.util.getRole(msg, collected.first().content);

      if (!roleRemoved) {
        collected.first().reply('Please reply with a valid server role.');
      } else {
        roleRemoved = roleRemoved.id;
        isValid = true;
      }
    }
    embed.addFields([
      {
        name: 'Role Removed',
        value: roleRemoved ? this.client.util.getRole(msg, roleRemoved)?.toString() : 'None',
        inline: true,
      },
    ]);

    await message.edit({
      content:
        '8️⃣ What message do you want the bot to reply with, when the item is bought (or used if an inventory item)? \nYou can use the Member, Server & Role tags from https://unbelievaboat.com/tags in this message. \nIf none, just reply `skip`.',
      embeds: [embed],
    });

    let replyMessage;

    collected = await msg.channel
      .awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ['time'],
      })
      .catch(() => null);
    if (!collected) {
      return msg.reply('You did not reply in time, the command has been cancelled.');
    }
    if (collected.first().content.toLowerCase() === 'cancel') {
      return collected.first().reply('The command has been cancelled.');
    }

    replyMessage = collected.first().content;

    if (replyMessage.toLowerCase() === 'skip') replyMessage = false;

    embed.addFields([{ name: 'Reply message', value: !replyMessage ? 'None' : replyMessage, inline: true }]);

    store[name] = {
      cost: cost.toString(),
      description,
      inventory,
      stock,
      roleRequired,
      roleGiven,
      roleRemoved,
      replyMessage,
    };

    await db.set(`servers.${msg.guild.id}.economy.store`, store);
    return message.edit({ content: ':white_check_mark: Item created successfully!', embeds: [embed] });
  }
}

module.exports = CreateItem;
