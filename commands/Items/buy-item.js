const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

class BuyItem extends Command {
  constructor(client) {
    super(client, {
      name: 'buy-item',
      category: 'Items',
      description: 'Buy an item from the store.',
      usage: 'buy-item <item>',
      examples: ['buy pizza'],
      aliases: ['buy'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const itemName = args.join(' ').toLowerCase();
    if (!itemName) return msg.reply('Please specify an item to buy.');

    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};

    // Find the item in the store regardless of case
    const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName);

    if (!itemKey) return msg.reply('That item does not exist in the store.');

    const item = store[itemKey];
    const itemCost = BigInt(item.cost);
    let userCash = BigInt(await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`));
    if (userCash < itemCost) return msg.reply('You do not have enough money to buy this item.');

    if (item.roleRequired) {
      const roleRequired = this.client.util.getRole(msg, item.roleRequired);
      if (roleRequired) {
        // Check if the member has the role
        const hasRole = msg.member.roles.cache.has(roleRequired.id);
        if (!hasRole) {
          return msg.reply(`You do not have the required role **${roleRequired.name}** to purchase this item.`);
        }
      } else {
        return msg.reply('The required role specified does not exist.');
      }
    }

    if (item.roleGiven || item.roleRemoved) {
      if (!msg.guild.members.me.permissions.has('ManageRoles'))
        return this.client.util.errorEmbed(
          msg,
          'Manage Roles permission is required on the bot to buy this item.',
          'Missing Permission',
        );
    }

    // Deduct the cost from the user's cash
    userCash = userCash - itemCost;
    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, userCash.toString());

    if (item.roleGiven) {
      const role = this.client.util.getRole(msg, item.roleGiven);
      await msg.member.roles.add(role).catch((error) => msg.channel.send(error));
    }
    if (item.roleRemoved) {
      const role = this.client.util.getRole(msg, item.roleRemoved);
      await msg.member.roles.remove(role).catch((error) => msg.channel.send(error));
    }

    if (!item.inventory) {
      if (!item.replyMessage) {
        return msg.channel.send('👍');
      }

      // Replace Member
      const memberCreatedAt = moment(msg.author.createdAt);
      const memberCreated = memberCreatedAt.format('D MM YY');
      const memberCreatedDuration = memberCreatedAt.from(moment(), true);
      let replyMessage = item.replyMessage
        .replace('{member.id}', msg.author.id)
        .replace('{member.username}', msg.author.username)
        .replace('{member.tag}', msg.author.tag)
        .replace('{member.mention}', msg.author)
        .replace('{member.created}', memberCreated)
        .replace('{member.created.duration}', memberCreatedDuration);

      // Replace Server
      const guildCreatedAt = moment(msg.guild.createdAt);
      const serverCreated = guildCreatedAt.format('D MM YY');
      const serverCreatedDuration = guildCreatedAt.from(moment(), true);

      replyMessage = replyMessage
        .replace('{server.id}', msg.guild.id)
        .replace('{server.name}', msg.guild.name)
        .replace('{server.members}', msg.guild.memberCount.toLocaleString())
        .replace('{server.created}', serverCreated)
        .replace('{servers.created.duration', serverCreatedDuration);

      const role =
        (await this.client.util.getRole(msg, item.roleGiven)) ||
        (await this.client.util.getRole(msg, item.roleRemoved)) ||
        (await this.client.util.getRole(msg, item.roleRequired));

      console.log(role);
      if (role) {
        const roleCreatedAt = moment(role.createdAt);
        const roleCreated = roleCreatedAt.format('D MM YY');
        const roleCreatedDuration = roleCreatedAt.from(moment(), true);

        replyMessage = replyMessage
          .replace('{role.id}', role.id)
          .replace('{role.name}', role.name)
          .replace('{role.mention}', role)
          .replace('{role.members}', role.members.size.toLocaleString())
          .replace('{role.created}', roleCreated)
          .replace('{role.created.duration}', roleCreatedDuration);
      }
      return msg.channel.send(replyMessage);
    }

    const userInventory = (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.inventory`)) || [];

    // Check if the user already owns the item
    const alreadyOwned = userInventory.find((inventoryItem) => inventoryItem.name.toLowerCase() === itemName);
    if (alreadyOwned) return msg.reply('You already own this item.');

    // Add the item to the user's inventory
    userInventory.push({ name: itemKey, ...item });

    await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.inventory`, userInventory);

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const csCost =
      itemCost.toLocaleString().length > 700
        ? currencySymbol + itemCost.toLocaleString().slice(0, 700) + '...'
        : currencySymbol + itemCost.toLocaleString();

    const embed = new EmbedBuilder()
      .setTitle('Purchase Successful')
      .setDescription(`You have successfully bought **${itemKey}** for ${csCost}.`)
      .setColor(msg.settings.embedColor)
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = BuyItem;
