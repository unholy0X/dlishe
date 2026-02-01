package database

import (
	"context"
	"database/sql"
	"fmt"
)

// TxFunc is a function that executes within a database transaction
type TxFunc func(tx *sql.Tx) error

// WithTransaction executes a function within a database transaction
// It automatically handles commit and rollback based on whether the function returns an error
func WithTransaction(ctx context.Context, db *sql.DB, fn TxFunc) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	// Ensure we always close the transaction
	defer func() {
		if p := recover(); p != nil {
			// A panic occurred, rollback and re-panic
			_ = tx.Rollback()
			panic(p)
		}
	}()

	// Execute the function
	if err := fn(tx); err != nil {
		// Function returned an error, rollback
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("rollback after error: %v (original error: %w)", rbErr, err)
		}
		return err
	}

	// Function succeeded, commit
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

// WithTransactionIsolation executes a function within a transaction with a specific isolation level
func WithTransactionIsolation(ctx context.Context, db *sql.DB, isolation sql.IsolationLevel, fn TxFunc) error {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{
		Isolation: isolation,
	})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("rollback after error: %v (original error: %w)", rbErr, err)
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
