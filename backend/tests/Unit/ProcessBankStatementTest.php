<?php

namespace Tests\Unit;

use App\Jobs\ProcessBankStatement;
use App\Models\BankStatement;
use App\Models\Member;
use App\Services\MatchingService;
use App\Services\OcrParserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class ProcessBankStatementTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_processes_statement(): void
    {
        Storage::fake('local');

        $statement = BankStatement::factory()->create([
            'file_path' => 'statements/test.pdf',
            'status' => 'uploaded',
        ]);

        $mockOcr = Mockery::mock(OcrParserService::class);
        $mockOcr->shouldReceive('parsePdf')
            ->once()
            ->andReturn([
                [
                    'tran_date' => '2025-04-04',
                    'particulars' => 'MPS2547 JACINTA WAN 0716227320',
                    'credit' => 3000,
                    'debit' => 0,
                    'balance' => 50000,
                ],
            ]);

        $mockMatching = Mockery::mock(MatchingService::class);
        $mockMatching->shouldReceive('matchBatch')
            ->once()
            ->andReturn([
                [
                    'client_tran_id' => 't_1',
                    'candidate_member_id' => 1,
                    'confidence' => 0.98,
                    'match_tokens' => ['0716227320'],
                    'match_reason' => 'Exact phone match',
                ],
            ]);

        $this->app->instance(OcrParserService::class, $mockOcr);
        $this->app->instance(MatchingService::class, $mockMatching);

        Member::factory()->create(['id' => 1, 'phone' => '0716227320']);

        $job = new ProcessBankStatement($statement);
        $job->handle($mockOcr, $mockMatching);

        $this->assertDatabaseHas('transactions', [
            'bank_statement_id' => $statement->id,
            'credit' => 3000,
        ]);
    }
}

