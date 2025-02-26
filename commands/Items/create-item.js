const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { v4: uuidv4 } = require('uuid');

class CreateItem extends Command {
  constructor(client) {
    super(client, {
      name: 'create-item',
      category: 'Items',
      description: 'Create an item to be shown in the store.',
      usage: 'create-item [item name]',
      longDescription:
        'Use this command without any arguments to be guided through every option, and type `cancel` at any point to stop. \nUse this command, with the item name, to create a "simple" item you can edit later.',
      aliases: ['createitem', 'new-item', 'item-create'],
      permLevel: 'Administrator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let name = args.join(' ');

    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};
    const botMember = msg.guild.members.cache.get(this.client.user.id);
    const filter = (m) => m.author.id === msg.author.id;
    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setFooter({ text: 'Type cancel to quit.' })
      .setTimestamp();
    let isValid = false;
    let collected;
    let messagesToDelete = [];
    let number = 1;

    const storeSize = Object.keys(store).length;
    if (storeSize > 50) {
      return msg.channel.send(
        'The store has reached the maximum number of items allowed. Please use `delete-item` to delete some before creating more.',
      );
    }

    const findItem = function (name) {
      // Find the item in the store regardless of case
      const item = Object.keys(store).find((key) => key.toLowerCase() === name.toLowerCase());
      if (item) {
        const itemEmbed = new EmbedBuilder()
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setColor(msg.settings.embedErrorColor)
          .setDescription('There is already an item with that name.');

        return itemEmbed;
      }
      return false;
    };

    if (name) {
      const item = findItem(name);
      if (item) return msg.channel.send({ embeds: [item] });

      const cost = 0;
      const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
      const costString = currencySymbol + cost.toLocaleString();
      const description = 'None provided';
      const inventory = true;
      const timeRemaining = null;
      const stock = null;
      const roleRequired = null;
      const roleGiven = null;
      const roleRemoved = null;
      const requiredBalance = null;
      const replyMessage = null;

      store[name] = {
        id: uuidv4(),
        cost,
        description,
        inventory,
        timeRemaining,
        stock,
        roleRequired,
        roleGiven,
        roleRemoved,
        requiredBalance,
        replyMessage,
      };

      const finalEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor(msg.settings.embedColor)
        .addFields([
          { name: 'Name', value: name, inline: true },
          { name: 'Price', value: costString, inline: true },
          { name: 'Description', value: 'None provided', inline: false },
          { name: 'Show in Inventory?', value: 'Yes', inline: true },
          { name: 'Time Remaining', value: 'No time limit', inline: true },
          { name: 'Stock Remaining', value: 'Infinity', inline: true },
          { name: 'Role Required', value: 'None', inline: true },
          { name: 'Role Given', value: 'None', inline: true },
          { name: 'Role Removed', value: 'None', inline: true },
          { name: 'Required Balance', value: 'None', inline: true },
          { name: 'Reply Message', value: 'None', inline: true },
        ])
        .setTimestamp();

      await db.set(`servers.${msg.guild.id}.economy.store`, store);
      return msg.channel.send({
        content: '✅ Item created successfully!',
        embeds: [finalEmbed],
      });
    }

    // Add blank name field
    embed.addFields([{ name: 'Name', value: '​', inline: true }]);
    const message = await msg.channel.send({
      content: `**${number}.** What should the new item be called? \nThis name should be unique and no more than 200 characters.`,
      embeds: [embed],
    });

    // Question 1: Collect the name from the user
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
          errors: ['time'],
        })
        .catch(() => null);

      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }
      if (collected.first().content.toLowerCase() === 'cancel') {
        return msg.reply('The command has been cancelled.');
      }

      name = collected.first().content;
      const item = findItem(name);

      if (name.length > 200) {
        const invalidLengthMessage = await msg.channel.send('The name must be 200 characters or less in length.');
        messagesToDelete.push(invalidLengthMessage);
      } else if (item) {
        const alreadyItemMessage = await msg.channel.send('There is already an item with that name.');
        messagesToDelete.push(alreadyItemMessage);
      } else {
        isValid = true;
      }
    }

    // Since its the first field we can just use setFields
    embed.setFields([{ name: 'Name', value: name, inline: true }]);
    let cost;
    isValid = false;
    number++;

    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({ content: `**${number}.** What would you like the price to be?`, embeds: [embed] });

    // Question 2: Collect the price from the user
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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
          .replace(/\..*/, '') // Remove everything after the first period
          .replace(/[^0-9,]/g, '') // Keep only digits and commas
          .replace(/,/g, ''), // Remove commas
      );

      if (isNaN(cost)) {
        const invalidCostMessage = await msg.channel.send(
          'The cost must be a valid number. Please enter the price again or type `cancel` to exit.',
        );
        messagesToDelete.push(invalidCostMessage);
      } else if (cost === Infinity) {
        const infinityMessage = await msg.channel.send(
          `The price must be less than ${BigInt(
            Number.MAX_VALUE,
          ).toLocaleString()}. Please enter the price again or type \`cancel\` to exit.`,
        );
        messagesToDelete.push(infinityMessage);
      } else if (cost < 0) {
        const negativeCostMessage = await msg.channel.send(
          'The price must be at least zero. Please enter the price again or type `cancel` to exit.',
        );
        messagesToDelete.push(negativeCostMessage);
      } else {
        isValid = true;
      }
    }

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const costString = currencySymbol + cost.toLocaleString();
    embed.addFields([{ name: 'Price', value: this.client.util.limitStringLength(costString, 0, 1024), inline: true }]);
    number++;

    isValid = false;
    let description;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** What would you like the description to be? \nThis should be no more than 1000 characters`,
      embeds: [embed],
    });

    // Question 3: Collect the description from the user
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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
        const invalidDescriptionMessage = await msg.channel.send(
          'The description must be less than 1000 characters. Please try again or use `cancel` to cancel the command',
        );
        messagesToDelete.push(invalidDescriptionMessage);
      } else {
        isValid = true;
      }
    }

    embed.addFields([{ name: 'Description', value: description, inline: false }]);
    number++;

    isValid = false;
    let inventory;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** Would you like this item to show up in inventory? (yes/no)`,
      embeds: [embed],
    });

    // Question 4: Collect whether the item should show up in inventory
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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
        const invalidAnswerMessage = await msg.channel.send('Please answer with either a `yes` or a `no`.');
        messagesToDelete.push(invalidAnswerMessage);
      } else {
        if (this.client.util.yes.includes(response)) {
          inventory = true;
          isValid = true;
        } else {
          inventory = false;
          isValid = true;
        }
      }
    }

    embed.addFields([{ name: 'Show in Inventory?', value: inventory ? 'Yes' : 'No', inline: true }]);
    number++;

    isValid = false;
    let timeRemaining;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** How long should this item stay in the store for? (e.g. 3 days) \nMinimum duration is 10 minutes. \nIf no limit, just reply \`skip\``,
      embeds: [embed],
    });
    const parse = (await import('parse-duration')).default;

    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
          errors: ['time'],
        })
        .catch(() => null);

      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }

      const response = collected.first().content.toLowerCase().trim().replace(/,/g, '');
      if (response === 'cancel') {
        return collected.first().reply('The command has been cancelled.');
      }
      if (response === 'skip') {
        timeRemaining = null;
        isValid = true;
        break;
      }

      if (/^\d+$/.test(response)) {
        const missingUnitMessage = await msg.channel.send(
          'Please specify a unit (e.g., `5 minutes`, `2 days`). Try again.',
        );
        messagesToDelete.push(missingUnitMessage);
        continue;
      }

      const timeLimit = parse(response);

      if (isNaN(timeLimit) || timeLimit === null) {
        const invalidTimeLimitMessage = await msg.channel.send('Invalid `duration` given. Please try again.');
        messagesToDelete.push(invalidTimeLimitMessage);
      } else if (timeLimit < 600000) {
        const tooShortLimitMessage = await msg.channel.send(
          'Duration remaining cannot be less than 10 minutes. Please try again.',
        );
        messagesToDelete.push(tooShortLimitMessage);
      } else if (timeLimit > 315576000000) {
        const tooLongLimitMessage = await msg.channel.send(
          'Duration remaining cannot be more than 10 years. Please try again or reply with `skip`.',
        );
        messagesToDelete.push(tooLongLimitMessage);
      } else {
        timeRemaining = Date.now() + timeLimit;
        isValid = true;
        break;
      }
    }

    const timeString = timeRemaining ? `Deleted <t:${Math.floor(timeRemaining / 1000)}:R>` : 'No time limit';
    embed.addFields([{ name: 'Time Remaining', value: timeString, inline: true }]);
    number++;

    isValid = false;
    let stock;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** How much stock of this item will there be? \nIf unlimited, just reply skip or infinity.`,
      embeds: [embed],
    });

    // Question 6: Ask how much stock the item should have
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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

      stock = parseInt(response.replace(/[^0-9\\.]/g, ''));
      if (isNaN(stock)) {
        const noNumberMessage = await msg.channel.send('Please answer with a number');
        messagesToDelete.push(noNumberMessage);
      } else if (stock < 1) {
        const zeroStockMessage = await msg.channel.send('Please answer with a number larger than zero.');
        messagesToDelete.push(zeroStockMessage);
      } else {
        isValid = true;
        break;
      }
    }

    const stockString = stock == null ? 'Infinity' : stock.toLocaleString();
    embed.addFields([
      { name: 'Stock Remaining', value: this.client.util.limitStringLength(stockString, 0, 1024), inline: true },
    ]);
    number++;

    isValid = false;
    let roleRequired;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** What role must the user already have in order to buy (and use if an inventory item) this item? \nIf none, just reply \`skip\`.`,
      embeds: [embed],
    });

    // Question 7: Ask what role the user should already have
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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
        const invalidRoleMessage = await msg.channel.send(
          'Please reply with a valid server role. Try again or use `cancel` to cancel the command',
        );
        messagesToDelete.push(invalidRoleMessage);
      } else {
        roleRequired = roleRequired.id;
        isValid = true;
      }
    }

    embed.addFields([
      {
        name: 'Role Required',
        value: roleRequired ? this.client.util.getRole(msg, roleRequired).toString() : 'None',
        inline: true,
      },
    ]);
    number++;

    isValid = false;
    let roleGiven;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** What role do you want to be given when this item is bought (or used if an inventory item)? \nIf none, just reply \`skip\`.`,
      embeds: [embed],
    });

    // Question 8: Ask what role should be given to the user
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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
        const invalidRoleMessage = await msg.channel.send(
          'Please reply with a valid server role. Try again or use `cancel` to cancel the command',
        );
        messagesToDelete.push(invalidRoleMessage);
      } else if (roleGiven.position >= botMember.roles.highest.position) {
        const roleGivenGreaterMessage = await msg.channel.send(
          "The role you mentioned is above or equal to the bot's highest role. Please try again with a different role or use `cancel` to cancel the command",
        );
        messagesToDelete.push(roleGivenGreaterMessage);
      } else {
        roleGiven = roleGiven.id;
        isValid = true;
      }
    }

    embed.addFields([
      {
        name: 'Role Given',
        value: roleGiven ? this.client.util.getRole(msg, roleGiven).toString() : 'None',
        inline: true,
      },
    ]);
    number++;

    isValid = false;
    let roleRemoved;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** What role do you want to be removed from the user when this item is bought (or used if an inventory item)? \nIf none, just reply \`skip\`.`,
      embeds: [embed],
    });

    // Question 9: Ask what role should be removed from the user
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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
        const invalidRoleMessage = await msg.channel.send(
          'Please reply with a valid server role. Try again or use `cancel` to cancel the command',
        );
        messagesToDelete.push(invalidRoleMessage);
      } else if (roleRemoved.position >= botMember.roles.highest.position) {
        const roleRemovedGreaterMessage = await msg.channel.send(
          "The role you mentioned is above or equal to the bot's highest role. Please try again with a different role or use `cancel` to cancel the command",
        );
        messagesToDelete.push(roleRemovedGreaterMessage);
      } else {
        roleRemoved = roleRemoved.id;
        isValid = true;
      }
    }

    embed.addFields([
      {
        name: 'Role Removed',
        value: roleRemoved ? this.client.util.getRole(msg, roleRemoved).toString() : 'None',
        inline: true,
      },
    ]);
    number++;

    let requiredBalance;
    isValid = false;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** What do you want the required balance to be? \nIf none, just reply \`skip\``,
      embeds: [embed],
    });

    // Question 10: Ask what the required balance should be
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
          errors: ['time'],
        })
        .catch(() => null);
      if (!collected) {
        return msg.reply('You did not reply in time, the command has been cancelled.');
      }
      if (collected.first().content.toLowerCase() === 'cancel') {
        return msg.reply('The command has been cancelled.');
      }

      const rawCollected = collected.first().content.toLowerCase();

      if (rawCollected === 'skip') {
        requiredBalance = null;
        isValid = true;
        break;
      }

      requiredBalance = parseInt(
        rawCollected
          .replace(/\..*/, '') // Remove everything after the first period
          .replace(/[^0-9,]/g, '') // Keep only digits and commas
          .replace(/,/g, ''), // Remove commas
      );

      if (isNaN(requiredBalance)) {
        const invalidResponseMessage = await msg.channel.send(
          'The required balance must be a valid number. Please enter the required balance again or type `cancel` to exit.',
        );
        messagesToDelete.push(invalidResponseMessage);
      } else if (requiredBalance === Infinity) {
        const infinityMessage = await msg.channel.send(
          `The required balance must be less than ${BigInt(
            Number.MAX_VALUE,
          ).toLocaleString()}. Please enter the required balance again or type \`cancel\` to exit.`,
        );
        messagesToDelete.push(infinityMessage);
      } else if (requiredBalance < 0) {
        const negativeResponseMessage = await msg.channel.send(
          'The price must be at least zero. Please enter the price again or type `cancel` to exit.',
        );
        messagesToDelete.push(negativeResponseMessage);
      } else {
        isValid = true;
      }
    }

    const requiredBalanceString = currencySymbol + cost.toLocaleString();
    embed.addFields([
      {
        name: 'Required Balance',
        value: this.client.util.limitStringLength(requiredBalanceString, 0, 1024),
        inline: true,
      },
    ]);
    number++;

    let replyMessage;
    isValid = false;
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    await message.edit({
      content: `**${number}.** What message do you want the bot to reply with, when the item is bought (or used if an inventory item)? \nYou can use the Member, Server & Role tags from https://mythical.cisn.xyz/tags in this message. \nThis should be no more than 1000 characters \nIf none, just reply \`skip\`.`,
      embeds: [embed],
    });

    // Question 11: What should the reply message be
    while (!isValid) {
      collected = await msg.channel
        .awaitMessages({
          filter,
          max: 1,
          time: 120000,
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

      if (replyMessage.length > 1000) {
        const replyTooLongMessage = await msg.channel.send(
          'The reply-message must be less than 1000 characters. Please try again or use `cancel` to cancel the command',
        );
        messagesToDelete.push(replyTooLongMessage);
      } else {
        isValid = true;
      }
    }

    embed.addFields([{ name: 'Reply Message', value: !replyMessage ? 'None' : replyMessage, inline: true }]);
    embed.clearFooter();
    messagesToDelete = messagesToDelete.filter((delMessages) => {
      return delMessages
        .delete()
        .then(() => false)
        .catch(() => true);
    });

    store[name] = {
      id: uuidv4(),
      cost,
      description,
      inventory,
      timeRemaining,
      stock,
      roleRequired,
      roleGiven,
      roleRemoved,
      requiredBalance,
      replyMessage,
    };

    await db.set(`servers.${msg.guild.id}.economy.store`, store);
    return message.edit({ content: '✅ Item created successfully!', embeds: [embed] });
  }
}

module.exports = CreateItem;
