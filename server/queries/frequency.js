// @flow
/**
 * Frequency query resolvers
 */
const {
  getFrequency,
  getFrequencyMetaData,
  getFrequencySubscriberCount,
  getTopFrequencies,
} = require('../models/frequency');
const { getStoriesByFrequency } = require('../models/story');
const { getCommunity } = require('../models/community');
import paginate from '../utils/paginate-arrays';
import { encode, decode } from '../utils/base64';
import type { PaginationOptions } from '../utils/paginate-arrays';
import type { GetFrequencyArgs } from '../models/frequency';
import type { GraphQLContext } from '../';

module.exports = {
  Query: {
    frequency: (_: any, args: GetFrequencyArgs) => getFrequency(args),
    topFrequencies: (_: any, { amount = 30 }: { amount: number }) =>
      getTopFrequencies(amount),
  },
  Frequency: {
    subscriberCount: ({ id }: { id: string }) =>
      getFrequencySubscriberCount(id),
    storyConnection: (
      { id }: { id: string },
      { first = 10, after }: PaginationOptions
    ) => {
      const cursor = decode(after);
      return getStoriesByFrequency(id, { first, after: cursor })
        .then(stories =>
          paginate(
            stories,
            { first, after: cursor },
            story => story.id === cursor
          )
        )
        .then(result => ({
          pageInfo: {
            hasNextPage: result.hasMoreItems,
          },
          edges: result.list.map(story => ({
            cursor: encode(story.id),
            node: story,
          })),
        }));
    },
    community: ({ community }: { community: string }) =>
      getCommunity({ id: community }),
    subscriberConnection: (
      { subscribers }: { subscribers: Array<string> },
      { first = 10, after }: PaginationOptions,
      { loaders }: GraphQLContext
    ) => {
      const { list, hasMoreItems } = paginate(subscribers, {
        first,
        after: decode(after),
      });
      return loaders.user.loadMany(list).then(users => ({
        pageInfo: {
          hasNextPage: hasMoreItems,
        },
        edges: users.map(user => ({
          cursor: encode(user.uid),
          node: user,
        })),
      }));
    },
    metaData: ({ id }: { id: string }) => {
      return getFrequencyMetaData(id).then(data => {
        return {
          stories: data[0],
          subscribers: data[1],
        };
      });
    },
  },
};
