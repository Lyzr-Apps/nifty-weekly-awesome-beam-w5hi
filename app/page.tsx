'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RiDashboardLine, RiHistoryLine, RiSettings4Line } from 'react-icons/ri'
import { FiTrendingUp, FiTrendingDown, FiTarget, FiAlertTriangle, FiChevronDown, FiChevronUp, FiRefreshCw, FiTrash2, FiCheck, FiX, FiInfo, FiDollarSign, FiPercent, FiActivity, FiShield, FiClock, FiCalendar, FiBarChart2 } from 'react-icons/fi'
import { BiLineChart } from 'react-icons/bi'

// ────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────
const MANAGER_AGENT_ID = '699feddfc9a21920fe8948e7'

const STORAGE_KEY_HISTORY = 'nifty_fno_strategy_history'
const STORAGE_KEY_SETTINGS = 'nifty_fno_settings'

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────
interface StrategyResponse {
  strategy_name?: string
  strategy_type?: string
  verdict?: string
  verdict_reasoning?: string
  confidence_score?: string
  nifty_spot_price?: string
  india_vix?: string
  trend_direction?: string
  support_levels?: string
  resistance_levels?: string
  pcr_ratio?: string
  max_pain?: string
  strike_details?: string
  premium_collected?: string
  premium_paid?: string
  net_premium?: string
  capital_required?: string
  max_profit?: string
  max_loss?: string
  breakeven_points?: string
  probability_of_profit?: string
  probability_of_loss?: string
  risk_reward_ratio?: string
  position_greeks?: string
  lot_size?: string
  number_of_lots?: string
  expiry_date?: string
  capital_allocation_advice?: string
  entry_timing?: string
  adjustment_triggers?: string
  exit_rules?: string
  risk_warnings?: string
  upcoming_events_risk?: string
  market_summary?: string
  weekly_outlook?: string
  disclaimer?: string
}

interface HistoryItem {
  id: string
  timestamp: string
  inputs: {
    profitTarget: number
    capital: number
    riskTolerance: string
    expiryPreference: string
  }
  response: StrategyResponse
}

interface AppSettings {
  defaultCapital: number
  defaultRiskTolerance: string
  preferredStrategyTypes: string[]
  defaultExpiryPreference: string
}

type ScreenType = 'dashboard' | 'history' | 'settings'

// ────────────────────────────────────────────────────────────────
// SAMPLE DATA
// ────────────────────────────────────────────────────────────────
const SAMPLE_RESPONSE: StrategyResponse = {
  strategy_name: 'Bull Put Spread on Nifty',
  strategy_type: 'Credit Spread',
  verdict: 'TRADE',
  verdict_reasoning: 'Market conditions are favorable with Nifty trading above key support levels. India VIX is within acceptable range, and the Put-Call Ratio indicates bullish sentiment. The probability of profit is above 70%, making this an attractive weekly income strategy.',
  confidence_score: '78%',
  nifty_spot_price: '24,850.30',
  india_vix: '13.45',
  trend_direction: 'Bullish with mild consolidation',
  support_levels: '24,600 / 24,450 / 24,200',
  resistance_levels: '25,000 / 25,150 / 25,350',
  pcr_ratio: '1.28 (Bullish)',
  max_pain: '24,800',
  strike_details: 'Sell 24,700 PE @ 85.50 | Buy 24,600 PE @ 52.30',
  premium_collected: '85.50 per lot',
  premium_paid: '52.30 per lot',
  net_premium: '33.20 per lot (Rs. 2,490 per lot)',
  capital_required: 'Rs. 1,25,000 (margin for 2 lots)',
  max_profit: 'Rs. 4,980 (2 lots x Rs. 2,490)',
  max_loss: 'Rs. 10,020 (2 lots x Rs. 5,010)',
  breakeven_points: '24,666.80',
  probability_of_profit: '72.5%',
  probability_of_loss: '27.5%',
  risk_reward_ratio: '1:2.01',
  position_greeks: 'Delta: +0.18 | Gamma: -0.003 | Theta: +12.50 | Vega: -8.20',
  lot_size: '75',
  number_of_lots: '2',
  expiry_date: '27 Feb 2026',
  capital_allocation_advice: 'Deploy no more than 15-20% of total trading capital. Keep remaining capital for adjustments or new opportunities. Maintain a minimum 2:1 reward-to-risk ratio across all active positions.',
  entry_timing: 'Enter after the first 30 minutes of market open (9:45 AM IST). Confirm that Nifty is holding above 24,700 and VIX remains below 15. Ideal entry window: 9:45 AM - 11:00 AM IST.',
  adjustment_triggers: '1. If Nifty breaks below 24,650 - consider rolling down the sold put strike.\n2. If VIX spikes above 16 - reduce position size by 50%.\n3. If premium collected drops to 50% of initial credit - book partial profits.',
  exit_rules: '1. Target: Exit at 70-80% of max profit (Rs. 3,486 - Rs. 3,984).\n2. Stop Loss: Exit if unrealized loss reaches 1.5x the premium collected.\n3. Time-based: Close position by Thursday 2:00 PM if not already exited.\n4. Never hold into expiry day last hour.',
  risk_warnings: 'WARNING: Options trading involves substantial risk. Past performance does not guarantee future results. This strategy has a defined max loss, but rapid market moves can cause slippage. Always use stop-loss orders.',
  upcoming_events_risk: 'RBI MPC meeting on 28 Feb (after expiry). US Fed minutes release on 26 Feb. Auto sales data expected mid-week. No major earnings scheduled for Nifty 50 companies this week.',
  market_summary: 'Nifty is trading in a bullish consolidation pattern above the 20-day EMA. FII flows have been mildly positive over the last 3 sessions. The banking sector continues to show strength, supporting overall market sentiment. Breadth indicators suggest moderate participation.',
  weekly_outlook: 'Expected range for the week: 24,500 - 25,200. Bias remains mildly bullish as long as 24,600 support holds. A breakout above 25,000 could accelerate to 25,200. Downside is protected by strong put writing at 24,500 strike.',
  disclaimer: 'This analysis is for educational and informational purposes only. It does not constitute financial advice, a recommendation, or an offer to trade. Options trading carries significant risk of loss. Consult a SEBI-registered financial advisor before making any trading decisions. Past performance is not indicative of future results.',
}

const SAMPLE_HISTORY: HistoryItem[] = [
  {
    id: 'sample-1',
    timestamp: '2026-02-25T10:30:00.000Z',
    inputs: { profitTarget: 2, capital: 200000, riskTolerance: 'Moderate', expiryPreference: 'current' },
    response: { ...SAMPLE_RESPONSE },
  },
  {
    id: 'sample-2',
    timestamp: '2026-02-24T09:15:00.000Z',
    inputs: { profitTarget: 1.5, capital: 150000, riskTolerance: 'Conservative', expiryPreference: 'current' },
    response: {
      ...SAMPLE_RESPONSE,
      strategy_name: 'Iron Condor on Nifty',
      strategy_type: 'Iron Condor',
      verdict: 'TRADE',
      confidence_score: '82%',
      probability_of_profit: '76.3%',
      probability_of_loss: '23.7%',
      net_premium: '48.60 per lot (Rs. 3,645 per lot)',
      max_profit: 'Rs. 7,290 (2 lots)',
      max_loss: 'Rs. 7,710 (2 lots)',
    },
  },
  {
    id: 'sample-3',
    timestamp: '2026-02-21T11:00:00.000Z',
    inputs: { profitTarget: 3, capital: 300000, riskTolerance: 'Aggressive', expiryPreference: 'next' },
    response: {
      ...SAMPLE_RESPONSE,
      strategy_name: 'Short Strangle on Nifty',
      strategy_type: 'Strangle',
      verdict: 'NO TRADE',
      verdict_reasoning: 'India VIX at 18.5 is elevated. Upcoming RBI policy meeting creates event risk. PCR ratio showing bearish divergence. Risk-reward does not justify entry at current volatility levels.',
      confidence_score: '45%',
      india_vix: '18.50',
      probability_of_profit: '52.1%',
      probability_of_loss: '47.9%',
    },
  },
]

// ────────────────────────────────────────────────────────────────
// DEFAULT SETTINGS
// ────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  defaultCapital: 200000,
  defaultRiskTolerance: 'Moderate',
  preferredStrategyTypes: ['Credit Spreads', 'Iron Condors'],
  defaultExpiryPreference: 'current',
}

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────
function parseAgentResponse(result: any): StrategyResponse | null {
  if (!result || !result.success) return null
  const response = result?.response
  if (!response) return null
  let data = response?.result
  if (!data || typeof data !== 'object') {
    data = response
  }
  if (data?.result && typeof data.result === 'object' && !Array.isArray(data.result)) {
    data = data.result
  }
  return data as StrategyResponse
}

function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '')
  return parseInt(cleaned, 10) || 0
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-medium text-sm mt-3 mb-1 text-foreground">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-medium text-base mt-3 mb-1 text-foreground">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-medium text-lg mt-4 mb-2 text-foreground">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm text-muted-foreground">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm text-muted-foreground">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-medium text-foreground">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function isTradeVerdict(verdict?: string): boolean {
  if (!verdict) return false
  const upper = verdict.toUpperCase()
  return upper.includes('TRADE') && !upper.includes('NO TRADE') && !upper.includes('NO-TRADE')
}

function isNoTradeVerdict(verdict?: string): boolean {
  if (!verdict) return false
  const upper = verdict.toUpperCase()
  return upper.includes('NO TRADE') || upper.includes('NO-TRADE')
}

// ────────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ────────────────────────────────────────────────────────────────
class InlineErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-medium mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6 border border-border bg-card">
      <div className="flex items-center gap-3 mb-2">
        <FiActivity className="w-5 h-5 text-primary animate-pulse" />
        <span className="text-sm text-muted-foreground tracking-widest uppercase">
          Analyzing Nifty market conditions...
        </span>
      </div>
      <Skeleton className="h-8 w-3/4 rounded-none" />
      <Skeleton className="h-4 w-1/2 rounded-none" />
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-none" />
        <Skeleton className="h-20 rounded-none" />
        <Skeleton className="h-20 rounded-none" />
        <Skeleton className="h-20 rounded-none" />
      </div>
      <Separator />
      <Skeleton className="h-6 w-1/3 rounded-none" />
      <Skeleton className="h-24 rounded-none" />
      <Skeleton className="h-6 w-1/4 rounded-none" />
      <Skeleton className="h-16 rounded-none" />
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string
  value?: string
  icon: React.ReactNode
  variant?: 'profit' | 'loss' | 'neutral'
}) {
  const colorClass =
    variant === 'profit'
      ? 'text-green-400'
      : variant === 'loss'
      ? 'text-red-400'
      : 'text-foreground'

  return (
    <div className="border border-border bg-secondary/30 p-4 space-y-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className={cn('text-sm font-medium', colorClass)}>{value ?? '--'}</p>
    </div>
  )
}

function DetailSection({
  title,
  content,
  icon,
}: {
  title: string
  content?: string
  icon: React.ReactNode
}) {
  if (!content) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          {title}
        </h4>
      </div>
      <div className="pl-6">{renderMarkdown(content)}</div>
    </div>
  )
}

function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return null
  const trade = isTradeVerdict(verdict)
  const noTrade = isNoTradeVerdict(verdict)

  if (trade) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-widest font-medium bg-green-900/40 text-green-400 border border-green-700/50">
        <FiCheck className="w-3 h-3" /> {verdict}
      </span>
    )
  }
  if (noTrade) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-widest font-medium bg-red-900/40 text-red-400 border border-red-700/50">
        <FiX className="w-3 h-3" /> {verdict}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-widest font-medium bg-primary/20 text-primary border border-primary/30">
      <FiInfo className="w-3 h-3" /> {verdict}
    </span>
  )
}

function StrategyCardDisplay({
  data,
  expanded,
  onToggleExpand,
}: {
  data: StrategyResponse
  expanded: boolean
  onToggleExpand: () => void
}) {
  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <h2 className="text-lg font-medium tracking-wider text-foreground">
              {data?.strategy_name ?? 'Strategy'}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              {data?.strategy_type && (
                <Badge
                  variant="outline"
                  className="rounded-none text-[10px] uppercase tracking-widest border-primary/40 text-primary"
                >
                  {data.strategy_type}
                </Badge>
              )}
              {data?.expiry_date && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 tracking-wider">
                  <FiCalendar className="w-3 h-3" /> {data.expiry_date}
                </span>
              )}
            </div>
          </div>
          <VerdictBadge verdict={data?.verdict} />
        </div>

        {/* Confidence */}
        {data?.confidence_score && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Confidence
            </span>
            <span className="text-sm font-medium text-primary">{data.confidence_score}</span>
          </div>
        )}

        {/* Verdict Reasoning */}
        {data?.verdict_reasoning && (
          <div className="border-l-2 border-primary/40 pl-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.verdict_reasoning}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Key Metrics Grid */}
      <div className="p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4 font-medium">
          Key Metrics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Capital Required"
            value={data?.capital_required}
            icon={<FiDollarSign className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Max Profit"
            value={data?.max_profit}
            icon={<FiTrendingUp className="w-3.5 h-3.5" />}
            variant="profit"
          />
          <MetricCard
            label="Max Loss"
            value={data?.max_loss}
            icon={<FiTrendingDown className="w-3.5 h-3.5" />}
            variant="loss"
          />
          <MetricCard
            label="Win Probability"
            value={data?.probability_of_profit}
            icon={<FiTarget className="w-3.5 h-3.5" />}
            variant="profit"
          />
          <MetricCard
            label="Loss Probability"
            value={data?.probability_of_loss}
            icon={<FiAlertTriangle className="w-3.5 h-3.5" />}
            variant="loss"
          />
          <MetricCard
            label="Risk-Reward"
            value={data?.risk_reward_ratio}
            icon={<FiBarChart2 className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      <Separator />

      {/* Strike Details & Premiums */}
      <div className="p-6 space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Trade Structure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MetricCard
            label="Strike Details"
            value={data?.strike_details}
            icon={<BiLineChart className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Net Premium"
            value={data?.net_premium}
            icon={<FiDollarSign className="w-3.5 h-3.5" />}
            variant="profit"
          />
          <MetricCard
            label="Breakeven"
            value={data?.breakeven_points}
            icon={<FiTarget className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Lot Size / Lots"
            value={`${data?.lot_size ?? '--'} x ${data?.number_of_lots ?? '--'} lots`}
            icon={<FiBarChart2 className="w-3.5 h-3.5" />}
          />
        </div>
        {(data?.premium_collected || data?.premium_paid) && (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Premium Collected"
              value={data?.premium_collected}
              icon={<FiTrendingUp className="w-3.5 h-3.5" />}
              variant="profit"
            />
            <MetricCard
              label="Premium Paid"
              value={data?.premium_paid}
              icon={<FiTrendingDown className="w-3.5 h-3.5" />}
              variant="loss"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Market Snapshot */}
      <div className="p-6 space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Market Snapshot
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Nifty Spot"
            value={data?.nifty_spot_price}
            icon={<BiLineChart className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="India VIX"
            value={data?.india_vix}
            icon={<FiActivity className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Trend"
            value={data?.trend_direction}
            icon={<FiTrendingUp className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="PCR Ratio"
            value={data?.pcr_ratio}
            icon={<FiBarChart2 className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Max Pain"
            value={data?.max_pain}
            icon={<FiTarget className="w-3.5 h-3.5" />}
          />
          <MetricCard
            label="Support Levels"
            value={data?.support_levels}
            icon={<FiShield className="w-3.5 h-3.5" />}
          />
        </div>
        {data?.resistance_levels && (
          <MetricCard
            label="Resistance Levels"
            value={data.resistance_levels}
            icon={<FiTrendingUp className="w-3.5 h-3.5" />}
          />
        )}
      </div>

      {/* Market Summary */}
      {data?.market_summary && (
        <>
          <Separator />
          <div className="p-6">
            <DetailSection
              title="Market Summary"
              content={data.market_summary}
              icon={<BiLineChart className="w-3.5 h-3.5 text-muted-foreground" />}
            />
          </div>
        </>
      )}

      {/* Expand/Collapse Toggle */}
      <Separator />
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-center gap-2 p-4 text-[10px] uppercase tracking-widest text-primary hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <FiChevronUp className="w-4 h-4" />
        ) : (
          <FiChevronDown className="w-4 h-4" />
        )}
        {expanded ? 'Hide Details' : 'View Full Details'}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border">
          <div className="p-6 space-y-6">
            <DetailSection
              title="Position Greeks"
              content={data?.position_greeks}
              icon={<FiActivity className="w-3.5 h-3.5 text-muted-foreground" />}
            />
            <DetailSection
              title="Entry Timing"
              content={data?.entry_timing}
              icon={<FiClock className="w-3.5 h-3.5 text-muted-foreground" />}
            />
            <DetailSection
              title="Adjustment Triggers"
              content={data?.adjustment_triggers}
              icon={<FiRefreshCw className="w-3.5 h-3.5 text-muted-foreground" />}
            />
            <DetailSection
              title="Exit Rules"
              content={data?.exit_rules}
              icon={<FiTarget className="w-3.5 h-3.5 text-muted-foreground" />}
            />
            <DetailSection
              title="Capital Allocation Advice"
              content={data?.capital_allocation_advice}
              icon={<FiDollarSign className="w-3.5 h-3.5 text-muted-foreground" />}
            />
            <DetailSection
              title="Weekly Outlook"
              content={data?.weekly_outlook}
              icon={<FiCalendar className="w-3.5 h-3.5 text-muted-foreground" />}
            />

            {data?.risk_warnings && (
              <div className="border border-red-800/40 bg-red-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FiAlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <h4 className="text-[10px] uppercase tracking-widest text-red-400 font-medium">
                    Risk Warnings
                  </h4>
                </div>
                <div className="pl-6">{renderMarkdown(data.risk_warnings)}</div>
              </div>
            )}

            <DetailSection
              title="Upcoming Events Risk"
              content={data?.upcoming_events_risk}
              icon={<FiAlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />}
            />

            {data?.disclaimer && (
              <div className="border border-border bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FiInfo className="w-3.5 h-3.5 text-muted-foreground" />
                  <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    Disclaimer
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  {data.disclaimer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryCardItem({
  item,
  onExpand,
  isExpanded,
}: {
  item: HistoryItem
  onExpand: () => void
  isExpanded: boolean
}) {
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    try {
      setDateStr(
        new Date(item.timestamp).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    } catch {
      setDateStr(item.timestamp ?? '')
    }
  }, [item.timestamp])

  return (
    <div className="border border-border bg-card">
      <button
        onClick={onExpand}
        className="w-full text-left p-5 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-sm font-medium text-foreground tracking-wide">
                {item.response?.strategy_name ?? 'Strategy'}
              </h3>
              <VerdictBadge verdict={item.response?.verdict} />
            </div>
            <div className="flex items-center gap-4 flex-wrap text-[10px] text-muted-foreground tracking-wider">
              <span className="flex items-center gap-1">
                <FiCalendar className="w-3 h-3" /> {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <FiPercent className="w-3 h-3" /> Target: {item.inputs?.profitTarget ?? '--'}%
              </span>
              <span className="flex items-center gap-1">
                <FiDollarSign className="w-3 h-3" /> Capital:{' '}
                {formatCurrency(item.inputs?.capital ?? 0)}
              </span>
              <span className="flex items-center gap-1">
                <FiShield className="w-3 h-3" /> {item.inputs?.riskTolerance ?? '--'}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-[10px]">
              <span className="text-green-400">
                Win: {item.response?.probability_of_profit ?? '--'}
              </span>
              <span className="text-muted-foreground">
                {item.response?.strategy_type ?? '--'}
              </span>
              <span className="text-primary">
                {item.response?.confidence_score ?? '--'} confidence
              </span>
            </div>
          </div>
          <div className="pt-1 shrink-0">
            {isExpanded ? (
              <FiChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <FiChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-border">
          <StrategyCardDisplay
            data={item.response}
            expanded={true}
            onToggleExpand={onExpand}
          />
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────
export default function Page() {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sample Data Toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // Dashboard State
  const [profitTarget, setProfitTarget] = useState(2)
  const [capital, setCapital] = useState(200000)
  const [capitalDisplay, setCapitalDisplay] = useState('2,00,000')
  const [riskTolerance, setRiskTolerance] = useState('Moderate')
  const [expiryPreference, setExpiryPreference] = useState('current')
  const [loading, setLoading] = useState(false)
  const [strategyData, setStrategyData] = useState<StrategyResponse | null>(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState('')

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Load settings and history from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as AppSettings
        setSettings(parsed)
        setCapital(parsed.defaultCapital ?? 200000)
        setCapitalDisplay(formatCurrency(parsed.defaultCapital ?? 200000))
        setRiskTolerance(parsed.defaultRiskTolerance ?? 'Moderate')
        setExpiryPreference(parsed.defaultExpiryPreference ?? 'current')
      }
    } catch {
      /* ignore */
    }
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as HistoryItem[]
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Save history
  const saveHistory = useCallback((items: HistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [])

  // Save settings
  const saveSettings = useCallback((s: AppSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }, [])

  // Handle capital input
  const handleCapitalChange = useCallback((val: string) => {
    const numericVal = parseCurrency(val)
    setCapital(numericVal)
    setCapitalDisplay(numericVal > 0 ? formatCurrency(numericVal) : '')
  }, [])

  // Generate Strategy
  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    setStrategyData(null)
    setDetailsExpanded(false)
    setActiveAgentId(MANAGER_AGENT_ID)

    const message = `Analyze Nifty F&O and suggest a weekly income strategy with the following parameters:
- Weekly Profit Target: ${profitTarget}%
- Available Capital: Rs.${formatCurrency(capital)}
- Risk Tolerance: ${riskTolerance}
- Expiry Preference: ${expiryPreference === 'current' ? 'Current Week' : 'Next Week'}

Please provide a complete strategy recommendation including market analysis, strategy computation, and final advisory verdict.`

    try {
      const result = await callAIAgent(message, MANAGER_AGENT_ID)
      const data = parseAgentResponse(result)

      if (data) {
        setStrategyData(data)
        const newItem: HistoryItem = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          inputs: { profitTarget, capital, riskTolerance, expiryPreference },
          response: data,
        }
        setHistory((prev) => {
          const updated = [newItem, ...prev]
          saveHistory(updated)
          return updated
        })
      } else {
        setErrorMsg(
          result?.error ?? 'Failed to parse strategy response. Please try again.'
        )
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [profitTarget, capital, riskTolerance, expiryPreference, saveHistory])

  // Clear History
  const clearHistory = useCallback(() => {
    setHistory([])
    saveHistory([])
    setExpandedHistoryId(null)
  }, [saveHistory])

  // Save Settings
  const handleSaveSettings = useCallback(() => {
    saveSettings(settings)
    setSettingsSaved(true)
    const timer = setTimeout(() => setSettingsSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [settings, saveSettings])

  // Filtered History
  const filteredHistory = historyFilter
    ? history.filter((item) => {
        const type = (item.response?.strategy_type ?? '').toLowerCase()
        const risk = (item.inputs?.riskTolerance ?? '').toLowerCase()
        const filterLow = historyFilter.toLowerCase()
        return type.includes(filterLow) || risk.includes(filterLow)
      })
    : history

  const displayHistory =
    showSampleData && history.length === 0 ? SAMPLE_HISTORY : filteredHistory
  const displayStrategy =
    showSampleData && !strategyData && !loading ? SAMPLE_RESPONSE : strategyData

  // Navigation Items
  const navItems: { id: ScreenType; label: string; icon: typeof RiDashboardLine }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: RiDashboardLine },
    { id: 'history', label: 'Strategy History', icon: RiHistoryLine },
    { id: 'settings', label: 'Settings', icon: RiSettings4Line },
  ]

  const strategyTypes = [
    'Credit Spreads',
    'Iron Condors',
    'Strangles',
    'Bull Put Spreads',
    'Bear Call Spreads',
  ]

  return (
    <InlineErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-border bg-card transition-transform duration-300 lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <BiLineChart className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-base font-medium tracking-widest text-foreground leading-tight">
                  NIFTY F&O
                </h1>
                <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                  Strategy Advisor
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveScreen(item.id)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-widest transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Agent Status */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Agent Status
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2',
                  activeAgentId
                    ? 'bg-green-400 animate-pulse'
                    : 'bg-muted-foreground/40'
                )}
              />
              <span className="text-[10px] text-muted-foreground tracking-wider">
                {activeAgentId ? 'Analyzing...' : 'Ready'}
              </span>
            </div>
            <p
              className="text-[9px] text-muted-foreground truncate tracking-wider"
              title="Nifty Strategy Coordinator"
            >
              Nifty Strategy Coordinator
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
                aria-label="Open menu"
              >
                <FiBarChart2 className="w-5 h-5" />
              </button>
              <h2 className="text-xs uppercase tracking-widest font-medium text-foreground">
                {activeScreen === 'dashboard' && 'Dashboard'}
                {activeScreen === 'history' && 'Strategy History'}
                {activeScreen === 'settings' && 'Settings'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Label
                htmlFor="sample-toggle"
                className="text-[10px] text-muted-foreground uppercase tracking-widest cursor-pointer"
              >
                Sample Data
              </Label>
              <Switch
                id="sample-toggle"
                checked={showSampleData}
                onCheckedChange={setShowSampleData}
              />
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* ═══════════ DASHBOARD ═══════════ */}
              {activeScreen === 'dashboard' && (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Input Panel */}
                  <div className="w-full lg:w-[35%] shrink-0">
                    <div className="border border-border bg-card p-6 space-y-6 lg:sticky lg:top-6">
                      <div>
                        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
                          Strategy Parameters
                        </h3>
                        <p className="text-[9px] text-muted-foreground tracking-wider">
                          Configure your weekly income strategy preferences
                        </p>
                      </div>

                      <Separator />

                      {/* Weekly Profit Target */}
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Weekly Profit Target (%)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none h-9 w-9 p-0"
                            onClick={() =>
                              setProfitTarget((prev) => Math.max(0.5, prev - 0.5))
                            }
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            value={profitTarget}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              if (!isNaN(val) && val >= 0 && val <= 10)
                                setProfitTarget(val)
                            }}
                            className="rounded-none text-center h-9 flex-1"
                            min={0.5}
                            max={10}
                            step={0.5}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none h-9 w-9 p-0"
                            onClick={() =>
                              setProfitTarget((prev) => Math.min(10, prev + 0.5))
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Available Capital */}
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Available Capital (INR)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            Rs.
                          </span>
                          <Input
                            type="text"
                            value={capitalDisplay}
                            onChange={(e) => handleCapitalChange(e.target.value)}
                            className="rounded-none pl-12 h-9"
                            placeholder="2,00,000"
                          />
                        </div>
                      </div>

                      {/* Risk Tolerance */}
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Risk Tolerance
                        </Label>
                        <div className="flex gap-0">
                          {['Conservative', 'Moderate', 'Aggressive'].map((level) => (
                            <button
                              key={level}
                              onClick={() => setRiskTolerance(level)}
                              className={cn(
                                'flex-1 py-2.5 text-[10px] uppercase tracking-widest border transition-colors',
                                riskTolerance === level
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/30'
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Expiry Preference */}
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Expiry Preference
                        </Label>
                        <Select
                          value={expiryPreference}
                          onValueChange={setExpiryPreference}
                        >
                          <SelectTrigger className="rounded-none h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-none">
                            <SelectItem value="current" className="rounded-none">
                              Current Week
                            </SelectItem>
                            <SelectItem value="next" className="rounded-none">
                              Next Week
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      {/* Generate Button */}
                      <Button
                        onClick={handleGenerate}
                        disabled={loading || capital < 10000}
                        className="w-full rounded-none h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] uppercase tracking-widest font-medium"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <FiRefreshCw className="w-4 h-4 animate-spin" />
                            Analyzing Market...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <BiLineChart className="w-4 h-4" />
                            Generate Strategy
                          </span>
                        )}
                      </Button>

                      {capital < 10000 && capital > 0 && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1 tracking-wider">
                          <FiAlertTriangle className="w-3 h-3" /> Minimum capital: Rs.
                          10,000
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Output Panel */}
                  <div className="flex-1 min-w-0">
                    {/* Error State */}
                    {errorMsg && (
                      <div className="border border-red-800/40 bg-red-950/20 p-5 mb-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <FiAlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-400 uppercase tracking-widest font-medium">
                            Error
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{errorMsg}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-none text-[10px] uppercase tracking-widest"
                          onClick={() => {
                            setErrorMsg('')
                            handleGenerate()
                          }}
                        >
                          <FiRefreshCw className="w-3 h-3 mr-2" /> Retry
                        </Button>
                      </div>
                    )}

                    {/* Loading State */}
                    {loading && <LoadingSkeleton />}

                    {/* Strategy Result */}
                    {!loading && displayStrategy && (
                      <StrategyCardDisplay
                        data={displayStrategy}
                        expanded={detailsExpanded}
                        onToggleExpand={() =>
                          setDetailsExpanded((prev) => !prev)
                        }
                      />
                    )}

                    {/* Empty State */}
                    {!loading && !displayStrategy && !errorMsg && (
                      <div className="border border-border bg-card flex flex-col items-center justify-center p-12 text-center space-y-4 min-h-[400px]">
                        <BiLineChart className="w-12 h-12 text-primary/40" />
                        <h3 className="text-xs uppercase tracking-widest text-foreground font-medium">
                          Ready to Analyze
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                          Configure your strategy parameters on the left and click
                          Generate Strategy. The AI advisor will analyze live Nifty
                          market conditions, compute optimal option strategies, and
                          provide a complete trade recommendation.
                        </p>
                        <div className="flex items-center gap-6 pt-2 text-[10px] text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <FiShield className="w-3 h-3" /> Risk Managed
                          </span>
                          <span className="flex items-center gap-1">
                            <FiTarget className="w-3 h-3" /> Data Driven
                          </span>
                          <span className="flex items-center gap-1">
                            <FiActivity className="w-3 h-3" /> Real-time
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════ HISTORY ═══════════ */}
              {activeScreen === 'history' && (
                <div className="space-y-4">
                  {/* Filter Bar */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Filter by strategy type or risk level..."
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        className="rounded-none h-9 max-w-sm text-sm"
                      />
                    </div>
                    {history.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none text-[10px] uppercase tracking-widest"
                        onClick={clearHistory}
                      >
                        <FiTrash2 className="w-3 h-3 mr-2" /> Clear History
                      </Button>
                    )}
                  </div>

                  {/* History List */}
                  {displayHistory.length === 0 ? (
                    <div className="border border-border bg-card flex flex-col items-center justify-center p-12 text-center space-y-4 min-h-[300px]">
                      <RiHistoryLine className="w-10 h-10 text-muted-foreground/30" />
                      <h3 className="text-xs uppercase tracking-widest text-foreground font-medium">
                        No History Yet
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Your generated strategies will appear here. Go to the
                        Dashboard to generate your first strategy.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none text-[10px] uppercase tracking-widest"
                        onClick={() => setActiveScreen('dashboard')}
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {displayHistory.length}{' '}
                        {displayHistory.length === 1 ? 'strategy' : 'strategies'}{' '}
                        found
                      </p>
                      {displayHistory.map((item) => (
                        <HistoryCardItem
                          key={item.id}
                          item={item}
                          isExpanded={expandedHistoryId === item.id}
                          onExpand={() =>
                            setExpandedHistoryId((prev) =>
                              prev === item.id ? null : item.id
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════ SETTINGS ═══════════ */}
              {activeScreen === 'settings' && (
                <div className="max-w-xl space-y-6">
                  <div className="border border-border bg-card p-6 space-y-6">
                    <div>
                      <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
                        Default Preferences
                      </h3>
                      <p className="text-[9px] text-muted-foreground tracking-wider">
                        These values will pre-fill the strategy form on the
                        Dashboard.
                      </p>
                    </div>

                    <Separator />

                    {/* Default Capital */}
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Default Capital (INR)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          Rs.
                        </span>
                        <Input
                          type="text"
                          value={formatCurrency(settings.defaultCapital)}
                          onChange={(e) => {
                            const val = parseCurrency(e.target.value)
                            setSettings((prev) => ({
                              ...prev,
                              defaultCapital: val,
                            }))
                          }}
                          className="rounded-none pl-12 h-9"
                        />
                      </div>
                    </div>

                    {/* Default Risk Tolerance */}
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Default Risk Tolerance
                      </Label>
                      <div className="flex gap-0">
                        {['Conservative', 'Moderate', 'Aggressive'].map(
                          (level) => (
                            <button
                              key={level}
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  defaultRiskTolerance: level,
                                }))
                              }
                              className={cn(
                                'flex-1 py-2.5 text-[10px] uppercase tracking-widest border transition-colors',
                                settings.defaultRiskTolerance === level
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/30'
                              )}
                            >
                              {level}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Preferred Strategy Types */}
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Preferred Strategy Types
                      </Label>
                      <div className="space-y-3">
                        {strategyTypes.map((type) => {
                          const checked =
                            Array.isArray(settings.preferredStrategyTypes) &&
                            settings.preferredStrategyTypes.includes(type)
                          return (
                            <div key={type} className="flex items-center gap-3">
                              <Checkbox
                                id={`strat-${type.replace(/\s/g, '-')}`}
                                checked={checked}
                                className="rounded-none"
                                onCheckedChange={(val) => {
                                  setSettings((prev) => {
                                    const current = Array.isArray(
                                      prev.preferredStrategyTypes
                                    )
                                      ? prev.preferredStrategyTypes
                                      : []
                                    if (val) {
                                      return {
                                        ...prev,
                                        preferredStrategyTypes: [
                                          ...current,
                                          type,
                                        ],
                                      }
                                    }
                                    return {
                                      ...prev,
                                      preferredStrategyTypes: current.filter(
                                        (t) => t !== type
                                      ),
                                    }
                                  })
                                }}
                              />
                              <label
                                htmlFor={`strat-${type.replace(/\s/g, '-')}`}
                                className="text-sm text-foreground cursor-pointer tracking-wide"
                              >
                                {type}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Default Expiry Preference */}
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Default Expiry Preference
                      </Label>
                      <Select
                        value={settings.defaultExpiryPreference}
                        onValueChange={(val) =>
                          setSettings((prev) => ({
                            ...prev,
                            defaultExpiryPreference: val,
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-none h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          <SelectItem value="current" className="rounded-none">
                            Current Week
                          </SelectItem>
                          <SelectItem value="next" className="rounded-none">
                            Next Week
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleSaveSettings}
                        className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] uppercase tracking-widest"
                      >
                        <FiCheck className="w-3.5 h-3.5 mr-2" /> Save Settings
                      </Button>
                      {settingsSaved && (
                        <span className="text-[10px] text-green-400 flex items-center gap-1 tracking-wider">
                          <FiCheck className="w-3 h-3" /> Settings saved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer Banner */}
            <div className="border-t border-border bg-card/50 px-6 py-3 mt-6">
              <p className="text-[9px] text-muted-foreground tracking-wider leading-relaxed flex items-start gap-2">
                <FiInfo className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Disclaimer: This tool provides educational analysis only. No
                  strategy guarantees profits. Always consult a registered financial
                  advisor before trading. Options trading involves substantial risk
                  of loss.
                </span>
              </p>
            </div>
          </div>
        </main>
      </div>
    </InlineErrorBoundary>
  )
}
