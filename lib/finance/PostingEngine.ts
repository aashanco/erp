// Aashan ERP Phase 26 - Modular Posting Engine

export type PostingProfile = {
  profile_code?: string;
  profile_name?: string;
  module?: string;
  transaction_type?: string;
  debit_account_code?: string;
  debit_account_name?: string;
  credit_account_code?: string;
  credit_account_name?: string;
  is_default?: boolean;
  is_active?: boolean;
};

export function getPostingProfile(profiles: PostingProfile[], transactionType: string, module?: string) {
  return profiles.find((p) =>
    p.is_active !== false &&
    p.transaction_type === transactionType &&
    (!module || p.module === module) &&
    p.is_default !== false
  ) || profiles.find((p) =>
    p.is_active !== false &&
    p.transaction_type === transactionType &&
    (!module || p.module === module)
  );
}

export function buildPostingLines(profile: PostingProfile | undefined, amount: number, description: string) {
  if (!profile) return [];
  return [
    {
      account_code: profile.debit_account_code || '',
      account_name: profile.debit_account_name || '',
      debit: Number(amount || 0),
      credit: 0,
      description,
    },
    {
      account_code: profile.credit_account_code || '',
      account_name: profile.credit_account_name || '',
      debit: 0,
      credit: Number(amount || 0),
      description,
    },
  ];
}
